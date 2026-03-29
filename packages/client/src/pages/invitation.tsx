import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { ROUTES } from '../config/routes';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import type { Account } from '@atlasmail/shared';

interface InvitationDetails {
  email: string;
  role: string;
  tenantName: string;
  expiresAt: string;
}

export function InvitationPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const addAccount = useAuthStore((s) => s.addAccount);

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (!token) return;
    api
      .get(`/auth/invitation/${token}`)
      .then(({ data }) => setInvitation(data.data))
      .catch((err) => setFetchError(err.response?.data?.error || 'Failed to load invitation'));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post(`/auth/invitation/${token}/accept`, { name, password });
      const { accessToken, refreshToken, account } = data.data;
      addAccount(account as Account, accessToken, refreshToken);
      navigate(ROUTES.HOME, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  }

  if (fetchError) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--color-bg-primary)',
          fontFamily: 'var(--font-family)',
        }}
      >
        <div
          style={{
            maxWidth: 400,
            padding: 32,
            textAlign: 'center',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 12, color: 'var(--color-text-primary)' }}>
            Invitation unavailable
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            {fetchError}
          </p>
          <a href={ROUTES.LOGIN} style={{ color: 'var(--color-accent-primary)', fontSize: 'var(--font-size-sm)' }}>
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-family)',
        }}
      >
        Loading invitation...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 32,
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-primary)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-semibold)',
            textAlign: 'center',
            marginBottom: 8,
            color: 'var(--color-text-primary)',
          }}
        >
          Join {invitation.tenantName}
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            textAlign: 'center',
            marginBottom: 24,
            color: 'var(--color-text-secondary)',
          }}
        >
          You've been invited as <strong>{invitation.role}</strong> to join{' '}
          <strong>{invitation.tenantName}</strong> on Atlas.
        </p>

        {error && (
          <div
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              marginBottom: 16,
              background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <Input
              label="Email"
              type="email"
              value={invitation.email}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Input
              label="Your name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            style={{
              width: '100%',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Setting up your account...' : 'Accept invitation'}
          </Button>
        </form>
      </div>
    </div>
  );
}
