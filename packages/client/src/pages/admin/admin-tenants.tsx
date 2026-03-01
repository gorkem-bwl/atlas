import { useNavigate } from 'react-router-dom';
import { Building2, Users, LayoutGrid, CalendarDays } from 'lucide-react';
import { useAdminTenants, useUpdateTenantStatus } from '../../hooks/use-admin';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Chip } from '../../components/ui/chip';

// ─── Styles ──────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 'var(--spacing-sm) var(--spacing-md)',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
  color: 'var(--color-text-tertiary)',
  borderBottom: '1px solid var(--color-border-primary)',
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
  fontSize: 'var(--font-size-sm)',
  borderBottom: '1px solid var(--color-border-secondary)',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetaStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--font-size-sm)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.7 }}>{icon}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'] }}>
        {value}
      </span>
      <span>{label}</span>
    </div>
  );
}

function TenantAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      aria-hidden="true"
      style={{
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-md)',
        background: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-accent-primary) 25%, transparent)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
        color: 'var(--color-accent-primary)',
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}
    >
      {initials || <Building2 size={14} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminTenantsPage() {
  const navigate = useNavigate();
  const { data: tenants, isLoading } = useAdminTenants();
  const statusMutation = useUpdateTenantStatus();

  const activeCount = tenants?.filter((t) => t.status === 'active').length ?? 0;
  const suspendedCount = tenants?.filter((t) => t.status === 'suspended').length ?? 0;
  const totalCount = tenants?.length ?? 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-xl)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'color-mix(in srgb, var(--color-accent-primary) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-accent-primary) 20%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent-primary)',
                flexShrink: 0,
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.2,
                }}
              >
                All tenants
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {isLoading ? 'Loading...' : `${totalCount} ${totalCount === 1 ? 'workspace' : 'workspaces'} registered`}
              </div>
            </div>
          </div>
        </div>

        {/* Stats pills */}
        {!isLoading && totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            <MetaStat icon={<Building2 size={13} />} label="total" value={totalCount} />
            <span style={{ color: 'var(--color-border-primary)' }}>·</span>
            <MetaStat icon={null} label="active" value={activeCount} />
            {suspendedCount > 0 && (
              <>
                <span style={{ color: 'var(--color-border-primary)' }}>·</span>
                <MetaStat icon={null} label="suspended" value={suspendedCount} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Table card ── */}
      <div
        style={{
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-primary)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div
            style={{
              padding: 'var(--spacing-3xl)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <Building2 size={28} style={{ opacity: 0.25 }} />
            Loading tenants...
          </div>
        ) : !tenants || tenants.length === 0 ? (
          /* ── Empty state ── */
          <div
            role="status"
            aria-label="No tenants"
            style={{
              padding: 'var(--spacing-3xl)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-tertiary)',
                opacity: 0.6,
              }}
            >
              <Building2 size={24} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                No tenants yet
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                Tenants will appear here once they sign up.
              </div>
            </div>
          </div>
        ) : (
          /* ── Table ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-elevated)' }}>
                  <th style={thStyle}>Workspace</th>
                  <th style={thStyle}>Plan</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Members</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Apps</th>
                  <th style={thStyle}>Created</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/admin/tenants/${t.id}`)}
                    style={{ cursor: 'pointer', transition: 'background var(--transition-normal)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    {/* Workspace name + slug */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <TenantAvatar name={t.name} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span
                            style={{
                              fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
                              color: 'var(--color-text-primary)',
                              fontSize: 'var(--font-size-sm)',
                            }}
                          >
                            {t.name}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 'var(--font-size-xs)',
                              color: 'var(--color-text-tertiary)',
                            }}
                          >
                            {t.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Plan chip */}
                    <td style={tdStyle}>
                      <Chip height={20} style={{ padding: '0 var(--spacing-xs)', fontSize: 'var(--font-size-xs)' }}>
                        {t.plan}
                      </Chip>
                    </td>

                    {/* Status badge */}
                    <td style={tdStyle}>
                      <Badge variant={t.status === 'active' ? 'success' : t.status === 'suspended' ? 'error' : 'default'}>
                        {t.status === 'active' ? 'Active' : t.status === 'suspended' ? 'Suspended' : t.status}
                      </Badge>
                    </td>

                    {/* Members */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-xs)',
                          color: 'var(--color-text-secondary)',
                          fontSize: 'var(--font-size-sm)',
                        }}
                      >
                        <Users size={13} style={{ opacity: 0.6 }} />
                        {t.memberCount}
                      </div>
                    </td>

                    {/* Apps */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-xs)',
                          color: 'var(--color-text-secondary)',
                          fontSize: 'var(--font-size-sm)',
                        }}
                      >
                        <LayoutGrid size={13} style={{ opacity: 0.6 }} />
                        {t.installationCount}
                      </div>
                    </td>

                    {/* Created date */}
                    <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-xs)',
                          fontSize: 'var(--font-size-xs)',
                        }}
                      >
                        <CalendarDays size={12} style={{ opacity: 0.6 }} />
                        {new Date(t.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <Button
                        variant={t.status === 'active' ? 'danger' : 'secondary'}
                        size="sm"
                        disabled={statusMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          statusMutation.mutate({
                            id: t.id,
                            status: t.status === 'active' ? 'suspended' : 'active',
                          });
                        }}
                        aria-label={`${t.status === 'active' ? 'Suspend' : 'Activate'} ${t.name}`}
                      >
                        {t.status === 'active' ? 'Suspend' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
