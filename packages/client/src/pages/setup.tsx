import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { ROUTES } from '../config/routes';
import type { Account } from '@atlasmail/shared';

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=1920&q=80&auto=format&fit=crop',
];

function getDailyImageIndex(): number {
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  return daysSinceEpoch % BG_IMAGES.length;
}

const glassInputStyle = {
  width: '100%',
  height: 38,
  padding: '0 12px',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 'var(--radius-md)',
  color: '#fff',
  fontSize: 'var(--font-size-md)',
  fontFamily: 'var(--font-family)',
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 500,
  marginBottom: 6,
  color: 'rgba(255,255,255,0.8)',
};

export function SetupPage() {
  const navigate = useNavigate();
  const addAccount = useAuthStore((s) => s.addAccount);

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/setup', {
        adminName,
        adminEmail,
        adminPassword,
        companyName,
      });
      const { accessToken, refreshToken, account } = data.data;
      addAccount(account as Account, accessToken, refreshToken);
      navigate(ROUTES.HOME, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  const bgImage = BG_IMAGES[getDailyImageIndex()];

  const focusHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
  };
  const blurHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-family)',
        overflow: 'hidden',
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: 'absolute',
          inset: '-20px',
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px) brightness(0.55)',
        }}
      />

      {/* Glass card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 440,
          padding: 32,
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: 8,
            color: '#fff',
          }}
        >
          Set up Atlas
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            textAlign: 'center',
            marginBottom: 24,
            color: 'rgba(255, 255, 255, 0.65)',
          }}
        >
          Create your admin account and organization
        </p>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: 16,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Organization name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              required
              style={glassInputStyle}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>

          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />

          <div>
            <label style={labelStyle}>Admin name</label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="John Doe"
              required
              style={glassInputStyle}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>
          <div>
            <label style={labelStyle}>Admin email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@company.com"
              required
              style={glassInputStyle}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              style={glassInputStyle}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 40,
              marginTop: 8,
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: 'var(--font-size-md)',
              fontWeight: 600,
              fontFamily: 'var(--font-family)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }}
          >
            {loading ? 'Setting up...' : 'Complete setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
