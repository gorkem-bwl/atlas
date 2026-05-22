import { db } from '../../../config/database';
import { parasutConnections } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../../../utils/crypto';
import { logger } from '../../../utils/logger';

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
