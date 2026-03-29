import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api-client';
import { ROUTES } from '../config/routes';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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
          Reset your password
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            textAlign: 'center',
            marginBottom: 24,
            color: 'var(--color-text-secondary)',
          }}
        >
          Enter your email and we'll send you a reset link
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

        {submitted ? (
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
              If an account exists with that email, a reset link has been sent.
            </div>
            <p
              style={{
                fontSize: 'var(--font-size-xs)',
                textAlign: 'center',
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
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
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
              {loading ? 'Sending...' : 'Send reset link'}
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
