import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Store,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useMarketplaceCatalog } from './hooks';
import { DockerStatus, CatalogSkeleton, DockerUnavailableBanner } from './components/marketplace-helpers';
import { AppCard } from './components/app-card';

// ─── Main Page ────────────────────────────────────────────────────

export function MarketplacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error } = useMarketplaceCatalog();
  const isSuperAdmin = useAuthStore(s => s.isSuperAdmin);
  const tenantRole = useAuthStore(s => s.tenantRole);
  const isAdmin = isSuperAdmin || tenantRole === 'owner' || tenantRole === 'admin';

  const items = data?.items ?? [];
  const dockerAvailable = data?.dockerAvailable ?? false;

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'auto',
        background: 'var(--color-bg-primary)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'var(--spacing-2xl) var(--spacing-2xl)',
        }}
      >
        {/* Page header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-2xl)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xs)' }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                  border: 'none', background: 'transparent', color: 'var(--color-text-tertiary)',
                  cursor: 'pointer', flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
              >
                <ArrowLeft size={16} />
              </button>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'var(--font-weight-bold)' as CSSProperties['fontWeight'],
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {t('marketplace.title')}
              </h1>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--font-size-md)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              {t('marketplace.subtitle')}
            </p>
          </div>
          {!isLoading && <DockerStatus available={dockerAvailable} t={t} />}
        </div>

        {/* Docker unavailable banner */}
        {!isLoading && !dockerAvailable && (
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <DockerUnavailableBanner t={t} />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-lg)',
              background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--spacing-xl)',
            }}
          >
            <XCircle size={20} style={{ color: 'var(--color-error)' }} />
            <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
              {t('marketplace.loadError')}
            </span>
          </div>
        )}

        {/* Loading */}
        {isLoading && <CatalogSkeleton />}

        {/* Grid */}
        {!isLoading && items.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'var(--spacing-xl)',
            }}
          >
            {items.map(app => (
              <AppCard key={app.id} app={app} isAdmin={!!isAdmin} t={t} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && items.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-2xl)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
            }}
          >
            <Store size={48} style={{ marginBottom: 'var(--spacing-lg)', opacity: 0.3 }} />
            <span style={{ fontSize: 'var(--font-size-lg)' }}>{t('marketplace.noApps')}</span>
          </div>
        )}
      </div>

    </div>
  );
}
