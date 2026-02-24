import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { ROUTES } from '../../config/routes';
import { Mail } from 'lucide-react';
import type { Account } from '@atlasmail/shared';

export function OAuthCallback() {
  const navigate = useNavigate();
  const { setAccount } = useAuthStore();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double-execution in React StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!code) {
      navigate(ROUTES.LOGIN);
      return;
    }

    async function exchangeCode() {
      try {
        const { data } = await api.post('/auth/google/callback', { code });
        const { accessToken, refreshToken, account } = data.data as {
          accessToken: string;
          refreshToken: string;
          account: Account;
        };
        localStorage.setItem('atlasmail_token', accessToken);
        localStorage.setItem('atlasmail_refresh_token', refreshToken);
        setAccount(account);
        navigate(ROUTES.INBOX, { replace: true });
      } catch {
        navigate(ROUTES.LOGIN);
      }
    }

    exchangeCode();
  }, [navigate, setAccount]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-family)',
        gap: 'var(--spacing-lg)',
      }}
    >
      {/* Animated brand icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      >
        <Mail size={28} color="#ffffff" />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Signing you in...
        </p>
        <p
          style={{
            margin: 'var(--spacing-xs) 0 0',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          Connecting to your Gmail account
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.96); }
        }
      `}</style>
    </div>
  );
}
