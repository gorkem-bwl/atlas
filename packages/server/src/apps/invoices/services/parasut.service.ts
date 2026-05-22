import { db } from '../../../config/database';
import { parasutConnections, invoices } from '../../../db/schema';
import { eq, and, isNotNull, ne } from 'drizzle-orm';
import { encrypt, decrypt } from '../../../utils/crypto';
import { logger } from '../../../utils/logger';
import {
  getSyncQueue,
  SyncJobName,
  PARASUT_SYNC_KEY_PREFIX,
  type ParasutSyncJobData,
} from '../../../config/queue';

// ─── Paraşüt integration service ────────────────────────────────────
//
// Per-tenant connection framework for Paraşüt (Turkish accounting /
// e-invoicing SaaS). Uses the OAuth2 authorization_code (OOB) flow:
//
//   1. Tenant admin saves Client ID + Client Secret + Company ID.
//   2. App builds an authorize URL; the admin opens it, approves in
//      Paraşüt, and copies back the displayed authorization code.
//   3. App exchanges the code for access + refresh tokens.
//   4. Tokens are stored encrypted; access tokens are refreshed on demand.
//      Paraşüt rotates the refresh token on every refresh, so the new
//      refresh token is persisted each time.
//
// No invoice push/pull is implemented yet — only the connection lifecycle
// and a reusable getAccessToken() for future API calls.

const PARASUT_AUTHORIZE_URL = 'https://api.parasut.com/oauth/authorize';
const PARASUT_TOKEN_URL = 'https://api.parasut.com/oauth/token';
const PARASUT_API_BASE = 'https://api.parasut.com/v4';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

// Shape returned to clients. NEVER contains secrets or tokens.
export interface ParasutStatus {
  connected: boolean;
  status: string; // 'connected' | 'disconnected' | 'error'
  companyId: string | null;
  connectedAt: Date | null;
  lastTestedAt: Date | null;
  lastError: string | null;
}

export interface SaveConnectionInput {
  clientId: string;
  clientSecret: string;
  companyId: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// In-memory access-token cache, keyed by tenantId. Avoids re-reading +
// decrypting the row (and refreshing) on every API call once push/pull
// lands. Cleared on process restart and on save/delete of a connection.
interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}
const tokenCache = new Map<string, CachedToken>();
// Treat a token as expired this far before its real expiry to avoid
// edge-of-expiry failures.
const TOKEN_EXPIRY_SKEW_MS = 60_000;

function toStatus(row: typeof parasutConnections.$inferSelect | undefined): ParasutStatus {
  if (!row) {
    return {
      connected: false,
      status: 'disconnected',
      companyId: null,
      connectedAt: null,
      lastTestedAt: null,
      lastError: null,
    };
  }
  return {
    connected: row.status === 'connected',
    status: row.status,
    companyId: row.companyId,
    connectedAt: row.connectedAt,
    lastTestedAt: row.lastTestedAt,
    lastError: row.lastError,
  };
}

async function getRow(tenantId: string) {
  const [row] = await db
    .select()
    .from(parasutConnections)
    .where(eq(parasutConnections.tenantId, tenantId))
    .limit(1);
  return row;
}

// Return the safe connection status for a tenant (no secrets / tokens).
export async function getConnection(tenantId: string): Promise<ParasutStatus> {
  const row = await getRow(tenantId);
  return toStatus(row);
}

// Upsert a tenant's connection. Encrypts the client secret, resets status
// to 'disconnected', and clears any stored tokens — the OAuth handshake
// must be (re)run after credentials change.
export async function saveConnection(
  tenantId: string,
  input: SaveConnectionInput,
): Promise<ParasutStatus> {
  const clientSecretEnc = encrypt(input.clientSecret);
  const now = new Date();

  const [row] = await db
    .insert(parasutConnections)
    .values({
      tenantId,
      clientId: input.clientId,
      clientSecretEnc,
      companyId: input.companyId,
      refreshTokenEnc: null,
      accessTokenEnc: null,
      tokenExpiresAt: null,
      status: 'disconnected',
      lastError: null,
      connectedAt: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: parasutConnections.tenantId,
      set: {
        clientId: input.clientId,
        clientSecretEnc,
        companyId: input.companyId,
        refreshTokenEnc: null,
        accessTokenEnc: null,
        tokenExpiresAt: null,
        status: 'disconnected',
        lastError: null,
        connectedAt: null,
        updatedAt: now,
      },
    })
    .returning();

  tokenCache.delete(tenantId);
  return toStatus(row);
}

// Remove a tenant's connection entirely.
export async function deleteConnection(tenantId: string): Promise<void> {
  await db.delete(parasutConnections).where(eq(parasutConnections.tenantId, tenantId));
  tokenCache.delete(tenantId);
  await unregisterParasutScheduler(tenantId);
}

// Build the authorize URL the admin opens to approve access. Requires a
// saved clientId.
export async function getAuthorizeUrl(tenantId: string): Promise<string> {
  const row = await getRow(tenantId);
  if (!row) {
    throw new Error('No Paraşüt connection configured for this tenant');
  }
  const params = new URLSearchParams({
    client_id: row.clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
  });
  return `${PARASUT_AUTHORIZE_URL}?${params.toString()}`;
}

// Low-level token endpoint call. Throws a clear Error on non-2xx.
async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(PARASUT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      // ignore body read failures
    }
    throw new Error(
      `Paraşüt token request failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    );
  }

  const data = (await res.json()) as Partial<TokenResponse>;
  if (!data.access_token) {
    throw new Error('Paraşüt token response did not include an access_token');
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? '',
    expires_in: data.expires_in ?? 0,
  };
}

// Persist a freshly issued token bundle (encrypted) + update the cache.
async function storeToken(tenantId: string, token: TokenResponse): Promise<void> {
  const expiresAt = token.expires_in > 0 ? new Date(Date.now() + token.expires_in * 1000) : null;
  await db
    .update(parasutConnections)
    .set({
      accessTokenEnc: encrypt(token.access_token),
      refreshTokenEnc: token.refresh_token ? encrypt(token.refresh_token) : null,
      tokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(parasutConnections.tenantId, tenantId));

  tokenCache.set(tenantId, {
    accessToken: token.access_token,
    expiresAt: expiresAt ? expiresAt.getTime() : 0,
  });
}

// Lightweight authenticated check: fetch a single contact. 2xx = connected.
async function contactsCheck(companyId: string, accessToken: string): Promise<void> {
  const url = `${PARASUT_API_BASE}/${encodeURIComponent(companyId)}/contacts?page%5Bsize%5D=1`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      // ignore body read failures
    }
    throw new Error(
      `Paraşüt API check failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    );
  }
}

// Exchange an authorization code for tokens, store them, and verify access.
// Persists the resulting status and returns the safe status.
export async function completeAuthorization(
  tenantId: string,
  code: string,
): Promise<ParasutStatus> {
  const row = await getRow(tenantId);
  if (!row) {
    throw new Error('No Paraşüt connection configured for this tenant');
  }

  const now = new Date();
  try {
    const clientSecret = decrypt(row.clientSecretEnc);
    const token = await requestToken({
      grant_type: 'authorization_code',
      client_id: row.clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: REDIRECT_URI,
    });
    await storeToken(tenantId, token);
    await contactsCheck(row.companyId, token.access_token);

    const [updated] = await db
      .update(parasutConnections)
      .set({
        status: 'connected',
        connectedAt: now,
        lastTestedAt: now,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(parasutConnections.tenantId, tenantId))
      .returning();
    // Connection is now live — start the continuous Paraşüt → Atlas sync.
    await registerParasutScheduler(tenantId);
    return toStatus(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ tenantId, err: error }, 'Paraşüt authorization failed');
    tokenCache.delete(tenantId);

    const [updated] = await db
      .update(parasutConnections)
      .set({
        status: 'error',
        lastError: message,
        lastTestedAt: now,
        updatedAt: now,
      })
      .where(eq(parasutConnections.tenantId, tenantId))
      .returning();
    return toStatus(updated);
  }
}

// Return a valid access token: cached/stored if not near expiry, otherwise
// refresh (persisting the rotated refresh token + new access token/expiry).
// Intended for reuse by future invoice push/pull calls.
export async function getAccessToken(tenantId: string): Promise<string> {
  const cached = tokenCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now() + TOKEN_EXPIRY_SKEW_MS) {
    return cached.accessToken;
  }

  const row = await getRow(tenantId);
  if (!row) {
    throw new Error('No Paraşüt connection configured for this tenant');
  }

  // Use the stored access token while it is still valid.
  if (
    row.accessTokenEnc &&
    row.tokenExpiresAt &&
    row.tokenExpiresAt.getTime() > Date.now() + TOKEN_EXPIRY_SKEW_MS
  ) {
    const accessToken = decrypt(row.accessTokenEnc);
    tokenCache.set(tenantId, { accessToken, expiresAt: row.tokenExpiresAt.getTime() });
    return accessToken;
  }

  if (!row.refreshTokenEnc) {
    throw new Error('Paraşüt connection is not authorized — complete the authorization flow first');
  }

  const clientSecret = decrypt(row.clientSecretEnc);
  const refreshToken = decrypt(row.refreshTokenEnc);
  const token = await requestToken({
    grant_type: 'refresh_token',
    client_id: row.clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  // Paraşüt rotates the refresh token — persist the new one.
  await storeToken(tenantId, token);
  return token.access_token;
}

// Test the connection: obtain a valid access token, hit the contacts
// endpoint, persist the resulting status, and return the safe status.
export async function testConnection(tenantId: string): Promise<ParasutStatus> {
  const row = await getRow(tenantId);
  if (!row) {
    throw new Error('No Paraşüt connection configured for this tenant');
  }

  const now = new Date();
  try {
    const accessToken = await getAccessToken(tenantId);
    await contactsCheck(row.companyId, accessToken);

    const [updated] = await db
      .update(parasutConnections)
      .set({
        status: 'connected',
        connectedAt: row.connectedAt ?? now,
        lastTestedAt: now,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(parasutConnections.tenantId, tenantId))
      .returning();
    return toStatus(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ tenantId, err: error }, 'Paraşüt connection test failed');
    tokenCache.delete(tenantId);

    const [updated] = await db
      .update(parasutConnections)
      .set({
        status: 'error',
        lastError: message,
        lastTestedAt: now,
        updatedAt: now,
      })
      .where(eq(parasutConnections.tenantId, tenantId))
      .returning();
    return toStatus(updated);
  }
}

// ─── Paraşüt v4 API (JSON:API) ──────────────────────────────────────
//
// Push an Atlas invoice to Paraşüt as a sales_invoice, ensuring the
// customer contact and line-item products exist first, and pull payment
// status back. Paraşüt v4 is JSON:API; the base is /v4/{companyId}.

// Atlas currency strings → Paraşüt currency codes. Paraşüt uses "TRL" for
// Turkish Lira; other ISO codes map straight through.
const PARASUT_CURRENCY_MAP: Record<string, string> = {
  TRY: 'TRL',
};
function toParasutCurrency(currency: string): string {
  return PARASUT_CURRENCY_MAP[currency] ?? currency;
}
// Paraşüt currency code → Atlas/ISO display code ("TRL" → "TRY").
const ATLAS_CURRENCY_MAP: Record<string, string> = {
  TRL: 'TRY',
};
function toAtlasCurrency(currency: string): string {
  return ATLAS_CURRENCY_MAP[currency] ?? currency;
}

// Format a Date (or ISO-ish string) as YYYY-MM-DD (UTC).
function toIsoDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

// Authenticated JSON:API call against the tenant's Paraşüt company. Returns
// parsed JSON; throws on non-2xx with the response body for diagnostics.
async function parasutApi(
  tenantId: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  const row = await getRow(tenantId);
  if (!row) {
    throw new Error('No Paraşüt connection configured for this tenant');
  }
  const accessToken = await getAccessToken(tenantId);
  const url = `${PARASUT_API_BASE}/${encodeURIComponent(row.companyId)}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Paraşüt API ${method} ${path} failed (HTTP ${res.status})${text ? `: ${text.slice(0, 500)}` : ''}`,
    );
  }
  return text ? JSON.parse(text) : {};
}

export interface EnsureContactInput {
  name: string;
  email?: string | null;
  taxNumber?: string | null;
}

// Find an existing Paraşüt contact by name, or create one. Returns its id.
export async function ensureContact(
  tenantId: string,
  input: EnsureContactInput,
): Promise<string> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('A customer name is required to sync to Paraşüt');
  }

  const search = await parasutApi(
    tenantId,
    'GET',
    `/contacts?filter[name]=${encodeURIComponent(name)}`,
  );
  const existing: any[] = Array.isArray(search?.data) ? search.data : [];
  const match =
    existing.find((c) => c?.attributes?.name?.trim?.() === name) ?? existing[0];
  if (match?.id) {
    return String(match.id);
  }

  const attributes: Record<string, unknown> = {
    name,
    contact_type: 'company',
    account_type: 'customer',
  };
  if (input.email) attributes.email = input.email;
  if (input.taxNumber) attributes.tax_number = input.taxNumber;

  const created = await parasutApi(tenantId, 'POST', '/contacts', {
    data: { type: 'contacts', attributes },
  });
  if (!created?.data?.id) {
    throw new Error('Paraşüt did not return a contact id');
  }
  return String(created.data.id);
}

export interface EnsureProductInput {
  name: string;
  vatRate: number;
}

// Per-tenant in-memory product name → id cache, scoped to avoid repeat
// lookups within a single push. Cleared on process restart.
const productCache = new Map<string, Map<string, string>>();
function getProductCache(tenantId: string): Map<string, string> {
  let m = productCache.get(tenantId);
  if (!m) {
    m = new Map();
    productCache.set(tenantId, m);
  }
  return m;
}

// Find an existing Paraşüt product by name, or create one. Returns its id.
export async function ensureProduct(
  tenantId: string,
  input: EnsureProductInput,
): Promise<string> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('A product/line description is required to sync to Paraşüt');
  }

  const cache = getProductCache(tenantId);
  const cached = cache.get(name);
  if (cached) return cached;

  const search = await parasutApi(
    tenantId,
    'GET',
    `/products?filter[name]=${encodeURIComponent(name)}`,
  );
  const existing: any[] = Array.isArray(search?.data) ? search.data : [];
  const match =
    existing.find((p) => p?.attributes?.name?.trim?.() === name) ?? existing[0];
  if (match?.id) {
    cache.set(name, String(match.id));
    return String(match.id);
  }

  const created = await parasutApi(tenantId, 'POST', '/products', {
    data: {
      type: 'products',
      attributes: {
        name,
        vat_rate: String(input.vatRate),
        unit: 'Adet',
      },
    },
  });
  if (!created?.data?.id) {
    throw new Error('Paraşüt did not return a product id');
  }
  cache.set(name, String(created.data.id));
  return String(created.data.id);
}

export interface PushInvoiceData {
  invoiceNumber: string;
  issueDate: Date | string;
  dueDate: Date | string;
  currency: string;
}
export interface PushLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}
export interface PushCustomer {
  name: string;
  email?: string | null;
  taxNumber?: string | null;
}

// Create a Paraşüt sales_invoice from an Atlas invoice. Ensures the
// customer contact and each line-item product exist first. Returns the new
// Paraşüt invoice id + invoice_no.
export async function pushInvoice(
  tenantId: string,
  invoice: PushInvoiceData,
  lineItems: PushLineItem[],
  customer: PushCustomer,
): Promise<{ parasutId: string; parasutNo: string }> {
  if (lineItems.length === 0) {
    throw new Error('Cannot push an invoice with no line items to Paraşüt');
  }

  const contactId = await ensureContact(tenantId, {
    name: customer.name,
    email: customer.email,
    taxNumber: customer.taxNumber,
  });

  // Paraşüt creates line items via details embedded INLINE in
  // relationships.details.data[] (each with its attributes + product
  // relationship) — NOT via the JSON:API `included` array with temp ids
  // (that yields "Record was not found: SalesInvoiceDetail"). Verified live.
  const details: any[] = [];
  for (const line of lineItems) {
    const productId = await ensureProduct(tenantId, {
      name: line.description,
      vatRate: line.taxRate,
    });
    details.push({
      type: 'sales_invoice_details',
      attributes: {
        quantity: line.quantity,
        unit_price: line.unitPrice,
        vat_rate: line.taxRate,
        description: line.description,
      },
      relationships: {
        product: { data: { type: 'products', id: productId } },
      },
    });
  }

  const payload = {
    data: {
      type: 'sales_invoices',
      attributes: {
        item_type: 'invoice',
        description: invoice.invoiceNumber,
        issue_date: toIsoDate(invoice.issueDate),
        due_date: toIsoDate(invoice.dueDate),
        currency: toParasutCurrency(invoice.currency),
      },
      relationships: {
        contact: { data: { type: 'contacts', id: contactId } },
        details: { data: details },
      },
    },
  };

  const created = await parasutApi(tenantId, 'POST', '/sales_invoices', payload);
  if (!created?.data?.id) {
    throw new Error('Paraşüt did not return a sales_invoice id');
  }
  return {
    parasutId: String(created.data.id),
    parasutNo: String(created.data.attributes?.invoice_no ?? invoice.invoiceNumber),
  };
}

// Pull payment status for a previously pushed Paraşüt sales_invoice.
export async function getInvoicePaymentStatus(
  tenantId: string,
  parasutId: string,
): Promise<{ paid: boolean; remaining: number; total: number }> {
  const res = await parasutApi(tenantId, 'GET', `/sales_invoices/${encodeURIComponent(parasutId)}`);
  const attrs = res?.data?.attributes ?? {};
  const paymentStatus: string = attrs.payment_status ?? '';
  const remaining = Number(attrs.remaining ?? 0) || 0;
  const total = Number(attrs.gross_total ?? attrs.net_total ?? 0) || 0;
  const paid = paymentStatus === 'paid' || remaining <= 0;
  return { paid, remaining, total };
}

// ─── Read-only listing of the tenant's existing Paraşüt invoices ────

export interface ParasutInvoiceListItem {
  id: string;
  invoiceNo: string | null;
  issueDate: string | null;
  dueDate: string | null;
  total: number;        // net_total (with VAT)
  preTaxTotal: number;  // gross_total (pre-VAT)
  currency: string;     // Atlas/ISO display code
  paymentStatus: string | null;
  remaining: number;
  description: string | null;
  contactName: string | null;
}

export interface ParasutInvoiceList {
  invoices: ParasutInvoiceListItem[];
  page: number;
  totalPages: number;
  totalCount: number;
}

// List the tenant's existing Paraşüt sales invoices (read-only), newest
// first. Resolves the customer name from the included contacts.
export async function listParasutInvoices(
  tenantId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<ParasutInvoiceList> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.max(1, Math.min(100, Math.floor(opts.pageSize ?? 25)));

  const res = await parasutApi(
    tenantId,
    'GET',
    `/sales_invoices?include=contact&sort=-issue_date` +
      `&page%5Bsize%5D=${pageSize}&page%5Bnumber%5D=${page}`,
  );

  // Build a contactId → name map from the included contacts.
  const included: any[] = Array.isArray(res?.included) ? res.included : [];
  const contactNames = new Map<string, string>();
  for (const inc of included) {
    if (inc?.type === 'contacts' && inc?.id) {
      const name = inc?.attributes?.name;
      if (name) contactNames.set(String(inc.id), String(name));
    }
  }

  const data: any[] = Array.isArray(res?.data) ? res.data : [];
  const invoices: ParasutInvoiceListItem[] = data.map((row) => {
    const attrs = row?.attributes ?? {};
    const contactId = row?.relationships?.contact?.data?.id;
    return {
      id: String(row?.id ?? ''),
      invoiceNo: attrs.invoice_no ?? null,
      issueDate: attrs.issue_date ?? null,
      dueDate: attrs.due_date ?? null,
      total: Number(attrs.net_total ?? 0) || 0,
      preTaxTotal: Number(attrs.gross_total ?? 0) || 0,
      currency: toAtlasCurrency(String(attrs.currency ?? '')),
      paymentStatus: attrs.payment_status ?? null,
      remaining: Number(attrs.remaining ?? 0) || 0,
      description: attrs.description ?? null,
      contactName: contactId ? contactNames.get(String(contactId)) ?? null : null,
    };
  });

  // Prefer Paraşüt's meta counts; otherwise infer from the current page.
  const meta = res?.meta ?? {};
  const totalCount =
    Number.isFinite(Number(meta.total_count)) ? Number(meta.total_count) : invoices.length;
  const totalPages =
    Number.isFinite(Number(meta.total_pages)) && Number(meta.total_pages) > 0
      ? Number(meta.total_pages)
      : Math.max(1, Math.ceil(totalCount / pageSize));

  return { invoices, page, totalPages, totalCount };
}

// ─── Continuous Paraşüt → Atlas sync (read-only mirror) ─────────────
//
// Policy (decided by the product): mirror read-only and "Paraşüt wins" on
// conflicts. We never auto-create Atlas invoices from Paraşüt-only
// invoices. The continuous sync only keeps payment/status fresh on LINKED
// Atlas invoices (those with `parasut_invoice_id`): if Paraşüt reports an
// invoice as paid and the Atlas copy isn't, we flip it to paid.

export interface ParasutSyncStats {
  updated: number;
  checked: number;
  skipped?: boolean;
}

// Refresh payment status on all linked, unpaid Atlas invoices for a tenant.
// Resilient: each invoice is wrapped in its own try/catch so one Paraşüt
// failure (e.g. a deleted invoice → 404) doesn't abort the whole batch.
export async function syncTenant(tenantId: string): Promise<ParasutSyncStats> {
  const connection = await getConnection(tenantId);
  if (!connection.connected) {
    return { updated: 0, checked: 0, skipped: true };
  }

  // Linked, active, not-yet-paid invoices. Skipping already-paid rows
  // avoids burning Paraşüt API calls on settled invoices.
  const linked = await db
    .select({ id: invoices.id, status: invoices.status, parasutInvoiceId: invoices.parasutInvoiceId })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        isNotNull(invoices.parasutInvoiceId),
        eq(invoices.isArchived, false),
        ne(invoices.status, 'paid'),
      ),
    );

  let updated = 0;
  let checked = 0;

  for (const inv of linked) {
    if (!inv.parasutInvoiceId) continue;
    try {
      const status = await getInvoicePaymentStatus(tenantId, inv.parasutInvoiceId);
      checked++;
      if (status.paid && inv.status !== 'paid') {
        const now = new Date();
        await db
          .update(invoices)
          .set({ status: 'paid', paidAt: now, parasutSyncedAt: now, updatedAt: now })
          .where(and(eq(invoices.id, inv.id), eq(invoices.tenantId, tenantId)));
        updated++;
      } else {
        // Touch the sync timestamp so we can see the mirror is alive.
        await db
          .update(invoices)
          .set({ parasutSyncedAt: new Date() })
          .where(and(eq(invoices.id, inv.id), eq(invoices.tenantId, tenantId)));
      }
    } catch (err) {
      // A 404 means the linked Paraşüt invoice was deleted upstream — skip
      // it (don't crash the batch). Any other per-invoice error is logged
      // and skipped too.
      logger.warn({ tenantId, invoiceId: inv.id, err }, 'Paraşüt sync: skipped invoice');
    }
  }

  logger.info({ tenantId, checked, updated, candidates: linked.length }, 'Paraşüt sync completed');
  return { updated, checked };
}

// Upsert the per-tenant repeatable sync scheduler (every 10 minutes) and
// fire an immediate run. No-op when the queue (Redis) is unavailable.
export async function registerParasutScheduler(tenantId: string): Promise<void> {
  const queue = getSyncQueue();
  if (!queue) return;
  try {
    await queue.upsertJobScheduler(
      `${PARASUT_SYNC_KEY_PREFIX}${tenantId}`,
      { every: 10 * 60 * 1000 },
      {
        name: SyncJobName.ParasutSync,
        data: { tenantId } satisfies ParasutSyncJobData,
      },
    );
    // Kick off an immediate sync so the user sees fresh data right away.
    await queue.add(SyncJobName.ParasutSync, { tenantId } satisfies ParasutSyncJobData);
  } catch (err) {
    logger.warn({ err, tenantId }, 'Failed to register Paraşüt sync scheduler');
  }
}

// Remove the per-tenant sync scheduler. No-op when the queue is unavailable.
export async function unregisterParasutScheduler(tenantId: string): Promise<void> {
  const queue = getSyncQueue();
  if (!queue) return;
  try {
    await queue.removeJobScheduler(`${PARASUT_SYNC_KEY_PREFIX}${tenantId}`);
  } catch (err) {
    logger.warn({ err, tenantId }, 'Failed to remove Paraşüt sync scheduler');
  }
}

// Reconcile the per-tenant Paraşüt sync schedulers against the DB:
//  - ensure every connected tenant has a scheduler,
//  - drop schedulers for tenants that are no longer connected.
// Idempotent — safe to call on every boot. Mirrors the Gmail reconcile.
export async function reconcileParasutSchedulers(): Promise<void> {
  const queue = getSyncQueue();
  if (!queue) return;

  const connectedRows = await db
    .select({ tenantId: parasutConnections.tenantId })
    .from(parasutConnections)
    .where(eq(parasutConnections.status, 'connected'));
  const connected = new Set(connectedRows.map((r) => r.tenantId));

  // Ensure a scheduler exists for every connected tenant.
  for (const tenantId of connected) {
    try {
      await queue.upsertJobScheduler(
        `${PARASUT_SYNC_KEY_PREFIX}${tenantId}`,
        { every: 10 * 60 * 1000 },
        {
          name: SyncJobName.ParasutSync,
          data: { tenantId } satisfies ParasutSyncJobData,
        },
      );
    } catch (err) {
      logger.warn({ err, tenantId }, 'Failed to upsert Paraşüt sync scheduler during reconcile');
    }
  }

  // Drop orphan schedulers whose tenant is no longer connected.
  const schedulers = await queue.getJobSchedulers(0, -1);
  let removed = 0;
  for (const s of schedulers) {
    if (!s.key || !s.key.startsWith(PARASUT_SYNC_KEY_PREFIX)) continue;
    const tenantId = s.key.slice(PARASUT_SYNC_KEY_PREFIX.length);
    if (connected.has(tenantId)) continue;
    try {
      await queue.removeJobScheduler(s.key);
      removed++;
    } catch (err) {
      logger.error({ err, key: s.key }, 'Failed to remove orphan Paraşüt scheduler');
    }
  }

  logger.info({ connected: connected.size, removed }, 'Paraşüt scheduler reconcile completed');
}
