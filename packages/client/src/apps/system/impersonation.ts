/**
 * Super-admin impersonation token handling.
 *
 * Design: when a super-admin clicks "Open as this tenant", we stash the
 * current access/refresh tokens under dedicated keys, then swap in the
 * short-lived (15m) impersonation token as the active token. The banner
 * in app.tsx reads impersonatedBy from the JWT; "Exit impersonation"
 * restores the stashed tokens.
 *
 * We intentionally do NOT touch the `atlasmail_tokens` map or
 * `atlasmail_accounts` — those represent persistent account logins.
 * Impersonation is ephemeral and must never be confused with a real
 * additional account.
 */
const STASH_ACCESS = 'atlasmail_impersonation_stash_token';
const STASH_REFRESH = 'atlasmail_impersonation_stash_refresh';
const STASH_TENANT = 'atlasmail_impersonation_target';

export function startImpersonation(token: string, target: { name: string; slug: string }) {
  const currentAccess = localStorage.getItem('atlasmail_token');
  const currentRefresh = localStorage.getItem('atlasmail_refresh_token');
  if (!currentAccess || !currentRefresh) {
    throw new Error('No active session to impersonate from');
  }
  localStorage.setItem(STASH_ACCESS, currentAccess);
  localStorage.setItem(STASH_REFRESH, currentRefresh);
  localStorage.setItem(STASH_TENANT, JSON.stringify(target));
  localStorage.setItem('atlasmail_token', token);
  // Impersonation tokens can't be refreshed — leave refresh token absent so
  // the client can't extend the session.
  localStorage.removeItem('atlasmail_refresh_token');
}

export function endImpersonation() {
  const stashedAccess = localStorage.getItem(STASH_ACCESS);
  const stashedRefresh = localStorage.getItem(STASH_REFRESH);
  if (!stashedAccess || !stashedRefresh) {
    // Nothing to restore — just clear whatever's there.
    localStorage.removeItem('atlasmail_token');
    localStorage.removeItem('atlasmail_refresh_token');
  } else {
    localStorage.setItem('atlasmail_token', stashedAccess);
    localStorage.setItem('atlasmail_refresh_token', stashedRefresh);
  }
  localStorage.removeItem(STASH_ACCESS);
  localStorage.removeItem(STASH_REFRESH);
  localStorage.removeItem(STASH_TENANT);
}

export function getImpersonationTarget(): { name: string; slug: string } | null {
  const raw = localStorage.getItem(STASH_TENANT);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
