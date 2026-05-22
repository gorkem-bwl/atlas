import { db } from '../../../config/database';
import { parasutConnections } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../../../utils/crypto';
import { logger } from '../../../utils/logger';

// ─── Paraşüt integration service ────────────────────────────────────
//
// Per-tenant connection framework for Paraşüt (Turkish accounting /
// e-invoicing SaaS). Each tenant connects their own account by entering
// Client ID, Client Secret, Email, Password and Company ID. We store the
// secret fields encrypted, can test the connection, and can mint an
// OAuth2 access token for future invoice push/pull. No invoice sync is
// implemented yet — only the connection lifecycle.

const PARASUT_TOKEN_URL = 'https://api.parasut.com/oauth/token';
const PARASUT_API_BASE = 'https://api.parasut.com/v4';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

// Shape returned to clients. NEVER contains secrets.
export interface ParasutStatus {
  connected: boolean;
  status: string; // 'connected' | 'disconnected' | 'error'
  companyId: string | null;
  email: string | null;
  connectedAt: Date | null;
  lastTestedAt: Date | null;
  lastError: string | null;
}

export interface SaveConnectionInput {
  clientId: string;
  clientSecret: string;
  email: string;
  password: string;
  companyId: string;
}

export interface ParasutToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// In-memory token cache, keyed by tenantId. Tokens are short-lived; this
// avoids re-authenticating on every API call once push/pull lands. Cleared
// on process restart and on save/delete of a connection.
interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}
const tokenCache = new Map<string, CachedToken>();
// Refresh a little before actual expiry to avoid edge-of-expiry failures.
const TOKEN_EXPIRY_SKEW_MS = 60_000;

function toStatus(row: typeof parasutConnections.$inferSelect | undefined): ParasutStatus {
  if (!row) {
    return {
      connected: false,
      status: 'disconnected',
      companyId: null,
      email: null,
      connectedAt: null,
      lastTestedAt: null,
      lastError: null,
    };
  }
  return {
    connected: row.status === 'connected',
    status: row.status,
    companyId: row.companyId,
    email: row.email,
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

// Return the safe connection status for a tenant (no secrets).
export async function getConnection(tenantId: string): Promise<ParasutStatus> {
  const row = await getRow(tenantId);
  return toStatus(row);
}

// Upsert a tenant's connection. Encrypts the secret fields and resets the
// status to 'disconnected' until the connection is tested.
export async function saveConnection(
  tenantId: string,
  input: SaveConnectionInput,
): Promise<ParasutStatus> {
  const clientSecretEnc = encrypt(input.clientSecret);
  const passwordEnc = encrypt(input.password);
  const now = new Date();

  const [row] = await db
    .insert(parasutConnections)
    .values({
      tenantId,
      clientId: input.clientId,
      clientSecretEnc,
      email: input.email,
      passwordEnc,
      companyId: input.companyId,
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
        email: input.email,
        passwordEnc,
        companyId: input.companyId,
        status: 'disconnected',
        lastError: null,
        connectedAt: null,
        updatedAt: now,
      },
    })
    .returning();

  // Credentials changed — invalidate any cached token.
  tokenCache.delete(tenantId);

  return toStatus(row);
}

// Remove a tenant's connection entirely.
export async function deleteConnection(tenantId: string): Promise<void> {
  await db.delete(parasutConnections).where(eq(parasutConnections.tenantId, tenantId));
  tokenCache.delete(tenantId);
}

// Authenticate against Paraşüt and return a fresh OAuth2 token bundle.
// Throws a clear Error when no connection exists or auth fails.
export async function fetchToken(tenantId: string): Promise<ParasutToken> {
  const row = await getRow(tenantId);
  if (!row) {
    throw new Error('No Paraşüt connection configured for this tenant');
  }

  const clientSecret = decrypt(row.clientSecretEnc);
  const password = decrypt(row.passwordEnc);

  const res = await fetch(PARASUT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'password',
      client_id: row.clientId,
      client_secret: clientSecret,
      username: row.email,
      password,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      // ignore body read failures
    }
    throw new Error(
      `Paraşüt authentication failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    );
  }

  const data = (await res.json()) as Partial<ParasutToken>;
  if (!data.access_token) {
    throw new Error('Paraşüt token response did not include an access_token');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? '',
    expires_in: data.expires_in ?? 0,
  };
}

// Return a cached valid access token or fetch a new one. Intended for
// reuse by future invoice push/pull calls.
export async function getAccessToken(tenantId: string): Promise<string> {
  const cached = tokenCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now() + TOKEN_EXPIRY_SKEW_MS) {
    return cached.accessToken;
  }

  const token = await fetchToken(tenantId);
  const expiresAt = Date.now() + (token.expires_in > 0 ? token.expires_in * 1000 : 0);
  tokenCache.set(tenantId, { accessToken: token.access_token, expiresAt });
  return token.access_token;
}

// Test the connection: authenticate, then hit a lightweight authed
// endpoint. Persists the resulting status and returns the safe status.
export async function testConnection(tenantId: string): Promise<ParasutStatus> {
  const row = await getRow(tenantId);
  if (!row) {
    throw new Error('No Paraşüt connection configured for this tenant');
  }

  const now = new Date();
  try {
    const token = await fetchToken(tenantId);
    // Cache the freshly minted token for future reuse.
    const expiresAt = Date.now() + (token.expires_in > 0 ? token.expires_in * 1000 : 0);
    tokenCache.set(tenantId, { accessToken: token.access_token, expiresAt });

    // Company-scoped resource so the test also validates the company_id
    // (Paraşüt's /me is account-level, not company-scoped). page[size]=1
    // keeps the response tiny.
    const res = await fetch(
      `${PARASUT_API_BASE}/${encodeURIComponent(row.companyId)}/contacts?page%5Bsize%5D=1`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          Accept: 'application/json',
        },
      },
    );

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
