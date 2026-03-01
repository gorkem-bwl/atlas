import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api-client';
import { ROUTES } from '../config/routes';

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
          Set new password
        </h1>
        <p
          style={{
            fontSize: 14,
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
            {error.includes('invalid or has expired') && (
              <span>
                {' '}
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  style={{ color: '#dc2626', fontWeight: 500 }}
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
              Your password has been reset successfully.
            </div>
            <Link
              to={ROUTES.LOGIN}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 16px',
                height: 34,
                background: '#13715B',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'center',
                textDecoration: 'none',
                boxSizing: 'border-box',
                lineHeight: '18px',
              }}
            >
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: 'var(--color-text-primary)',
                }}
              >
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
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
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
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
              {loading ? 'Resetting...' : 'Reset password'}
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
