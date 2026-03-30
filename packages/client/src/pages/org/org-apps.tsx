import { useAuthStore } from '../../stores/auth-store';
import { useMyTenants } from '../../hooks/use-platform';
import { useTenantAppsAdmin, useToggleTenantApp } from '../../hooks/use-tenant-app-admin';
import { appRegistry } from '../../apps';
import { LayoutGrid } from 'lucide-react';
import { Chip } from '../../components/ui/chip';
import { Skeleton } from '../../components/ui/skeleton';

// ---------------------------------------------------------------------------
// OrgAppsPage
// ---------------------------------------------------------------------------

export function OrgAppsPage() {
  const storeTenantId = useAuthStore((s) => s.tenantId);
  const { data: tenants, isLoading: tenantsLoading } = useMyTenants();
  const tenant = tenants?.[0];
  const effectiveTenantId = storeTenantId ?? tenant?.id ?? '';

  const { data: tenantApps, isLoading: appsLoading } = useTenantAppsAdmin(effectiveTenantId);
  const toggleMutation = useToggleTenantApp(effectiveTenantId);
  const allApps = appRegistry.getAll();

  const enabledSet = new Set(
    (tenantApps ?? []).filter((a) => a.isEnabled).map((a) => a.appId),
  );

  const isLoading = tenantsLoading || appsLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', maxWidth: 720 }}>
        <Skeleton width={140} height={24} borderRadius="var(--radius-sm)" />
        <div style={{
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-primary)',
          padding: 'var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
        }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={48} borderRadius="var(--radius-sm)" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', maxWidth: 720 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
      }}>
        <LayoutGrid size={15} style={{ color: 'var(--color-text-tertiary)' }} />
        <span style={{
          fontSize: 'var(--font-size-md)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
        }}>
          Apps
        </span>
        <Chip height={18} style={{ padding: '0 var(--spacing-xs)' }}>
          {enabledSet.size}
        </Chip>
      </div>

      <div style={{
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-primary)',
        overflow: 'hidden',
      }}>
        {allApps.map((app, i) => {
          const isEnabled = enabledSet.has(app.id);
          return (
            <div
              key={app.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                borderBottom: i < allApps.length - 1 ? '1px solid var(--color-border-secondary)' : 'none',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: app.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <app.icon size={16} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                  {app.name}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  {app.category}
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${app.name}`}
                  aria-checked={isEnabled}
                  checked={isEnabled}
                  disabled={toggleMutation.isPending}
                  onChange={() => toggleMutation.mutate({ appId: app.id, enable: !isEnabled })}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                <div
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    background: isEnabled ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
                    border: `1px solid ${isEnabled ? 'var(--color-accent-primary)' : 'var(--color-border-primary)'}`,
                    transition: 'background 0.2s, border-color 0.2s',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'var(--color-bg-primary)',
                      position: 'absolute',
                      top: 1,
                      left: isEnabled ? 17 : 1,
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                    }}
                  />
                </div>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
