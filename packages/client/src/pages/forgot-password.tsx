import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api-client';
import { ROUTES } from '../config/routes';

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
          border: '1px solid #d0d5dd',
          borderRadius: 8,
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: 8,
            color: 'var(--color-text-primary)',
          }}
        >
          Reset your password
        </h1>
        <p
          style={{
            fontSize: 14,
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
              padding: '8px 12px',
              marginBottom: 16,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 4,
              color: '#dc2626',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {submitted ? (
          <div>
            <div
              style={{
                padding: '12px 16px',
                marginBottom: 24,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 4,
                color: '#166534',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              If an account exists with that email, a reset link has been sent.
            </div>
            <p
              style={{
                fontSize: 13,
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Link
                to={ROUTES.LOGIN}
                style={{ color: '#13715B', textDecoration: 'none', fontWeight: 500 }}
              >
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: 'var(--color-text-primary)',
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d0d5dd',
                  borderRadius: 4,
                  fontSize: 14,
                  outline: 'none',
                  background: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 16px',
                height: 34,
                background: '#13715B',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>

            <p
              style={{
                fontSize: 13,
                textAlign: 'center',
                marginTop: 20,
                color: 'var(--color-text-secondary)',
              }}
            >
              <Link
                to={ROUTES.LOGIN}
                style={{ color: '#13715B', textDecoration: 'none', fontWeight: 500 }}
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
