import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api-client';
import { ROUTES } from '../config/routes';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.error;
      if (message?.toLowerCase().includes('expired') || message?.toLowerCase().includes('invalid')) {
        setError('This reset link is invalid or has expired. Please request a new one.');
      } else {
        setError(message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
          maxWidth: 400,
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
          Set new password
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            textAlign: 'center',
            marginBottom: 24,
            color: 'var(--color-text-secondary)',
          }}
        >
          Choose a strong password for your account
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
            {error.includes('invalid or has expired') && (
              <span>
                {' '}
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  style={{ color: 'var(--color-error)', fontWeight: 500 }}
                >
                  Request a new link
                </Link>
              </span>
            )}
          </div>
        )}

        {success ? (
          <div>
            <div
              style={{
                padding: 'var(--spacing-md) var(--spacing-lg)',
                marginBottom: 24,
                background: 'color-mix(in srgb, var(--color-success, #16a34a) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-success, #16a34a) 25%, transparent)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-success, #166534)',
                fontSize: 'var(--font-size-xs)',
                lineHeight: 1.5,
              }}
            >
              Your password has been reset successfully.
            </div>
            <Link
              to={ROUTES.LOGIN}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: 34,
                background: 'var(--color-accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer',
                textAlign: 'center',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <Input
                label="New password"
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
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
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
              {loading ? 'Resetting...' : 'Reset password'}
            </Button>

            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                textAlign: 'center',
                marginTop: 20,
                color: 'var(--color-text-secondary)',
              }}
            >
              <Link
                to={ROUTES.LOGIN}
                style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', fontWeight: 500 }}
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
