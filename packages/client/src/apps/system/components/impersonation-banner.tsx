import { useEffect, useState } from 'react';
import { endImpersonation, getImpersonationTarget } from '../impersonation';

function decodeJwt(token: string): { impersonatedBy?: string; exp?: number } | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

/**
 * Renders a sticky warning banner at the top of the app whenever the active
 * JWT carries an impersonatedBy claim. Exposes a button to exit.
 * Returns null otherwise — zero cost in the normal case.
 */
export function ImpersonationBanner() {
  const [token, setToken] = useState(() => localStorage.getItem('atlasmail_token'));

  // Poll once per second so an impersonation started in this tab shows up
  // without a remount, and so we notice when the token expires (exp claim
  // in the past). Cheap: a string read + parse.
  useEffect(() => {
    const id = setInterval(() => {
      setToken(localStorage.getItem('atlasmail_token'));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload?.impersonatedBy) return null;

  const target = getImpersonationTarget();

  const handleExit = () => {
    endImpersonation();
    window.location.href = '/system?view=tenants';
  };

  const expiresAt = payload.exp ? new Date(payload.exp * 1000) : null;
  const minutesLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 60000)) : null;

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 9999,
      background: '#b45309',
      color: 'white',
      padding: '8px 16px',
      fontSize: 'var(--font-size-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      fontFamily: 'var(--font-family)',
    }}>
      <div>
        <strong>Impersonating</strong>
        {target ? <> tenant <strong>{target.name}</strong> ({target.slug})</> : null}
        {minutesLeft !== null ? <> — expires in {minutesLeft}m</> : null}
      </div>
      <button
        onClick={handleExit}
        style={{
          background: 'white',
          color: '#b45309',
          border: 'none',
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Exit impersonation
      </button>
    </div>
  );
}
