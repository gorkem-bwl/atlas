import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import { useAdminLogin } from '../../hooks/use-admin';
import { ROUTES } from '../../config/routes';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const loginMutation = useAdminLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { username, password },
      { onSuccess: () => navigate(ROUTES.ADMIN, { replace: true }) },
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg-secondary)',
        fontFamily: 'var(--font-family)',
        padding: 'var(--spacing-xl)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 380,
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-primary)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Icon and title section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 'var(--spacing-2xl) var(--spacing-2xl) var(--spacing-xl)',
            gap: 'var(--spacing-md)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'color-mix(in srgb, var(--color-accent-primary) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent-primary) 25%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield
              size={22}
              style={{ color: 'var(--color-accent-primary)' }}
              strokeWidth={1.75}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              System admin
            </h1>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                margin: 'var(--spacing-xs) 0 0',
                lineHeight: 1.5,
              }}
            >
              Sign in to manage the platform
            </p>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'var(--color-border-primary)',
            marginBottom: 'var(--spacing-xl)',
          }}
        />

        {/* Form inputs and actions */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-lg)',
            padding: '0 var(--spacing-2xl) var(--spacing-2xl)',
          }}
        >
          {loginMutation.isError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-error)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
              Invalid username or password
            </div>
          )}

          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            autoComplete="username"
            placeholder="Enter your username"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loginMutation.isPending}
            style={{
              width: '100%',
              opacity: loginMutation.isPending ? 0.7 : 1,
              cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
              marginTop: 'var(--spacing-xs)',
            }}
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>
    </div>
  );
}
