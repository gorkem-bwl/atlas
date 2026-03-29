import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Cpu, HardDrive, MemoryStick, LayoutGrid } from 'lucide-react';
import { useAdminTenant, useUpdateTenantStatus, useUpdateTenantPlan } from '../../hooks/use-admin';
import { useTenantAppsAdmin, useToggleTenantApp } from '../../hooks/use-tenant-app-admin';
import { appRegistry } from '../../apps';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../config/query-keys';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Chip } from '../../components/ui/chip';
import { Skeleton } from '../../components/ui/skeleton';
import { Select } from '../../components/ui/select';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

const PLANS = ['starter', 'pro', 'enterprise'];

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-medium)',
  color: 'var(--color-text-tertiary)',
  borderBottom: '1px solid var(--color-border-primary)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 'var(--font-size-sm)',
  borderBottom: '1px solid var(--color-border-secondary)',
  whiteSpace: 'nowrap',
};

type BadgeVariant = 'success' | 'error' | 'warning' | 'default';

function statusVariant(status: string): BadgeVariant {
  if (['active', 'healthy'].includes(status)) return 'success';
  if (['suspended'].includes(status)) return 'error';
  return 'default';
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'var(--color-text-tertiary)',
  pro: 'var(--color-accent-primary)',
  enterprise: 'var(--color-warning)',
};

export function AdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading } = useAdminTenant(id!);
  const statusMutation = useUpdateTenantStatus();
  const planMutation = useUpdateTenantPlan();
  const qc = useQueryClient();

  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.admin.tenant(id!) });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
        <Skeleton width={140} height={28} borderRadius="var(--radius-md)" />
        <div style={{
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-primary)',
          padding: 'var(--spacing-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-lg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            <Skeleton width={200} height={24} borderRadius="var(--radius-sm)" />
            <Skeleton width={64} height={20} borderRadius="var(--radius-lg)" />
            <Skeleton width={52} height={20} borderRadius="var(--radius-lg)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-secondary)' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                <Skeleton width={80} height={12} borderRadius={3} />
                <Skeleton width={100} height={16} borderRadius={3} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Skeleton width={120} height={20} borderRadius="var(--radius-sm)" />
          <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)', padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={36} borderRadius="var(--radius-sm)" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
        Tenant not found
      </div>
    );
  }

  const isSuspended = tenant.status === 'suspended';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

      <div>
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={14} />}
          onClick={() => navigate('/admin/tenants')}
        >
          Back to tenants
        </Button>
      </div>

      {/* Header info card */}
      <div style={{
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-primary)',
        padding: 'var(--spacing-xl)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--spacing-md)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
              }}>
                {tenant.name}
              </span>
              <Badge variant={statusVariant(tenant.status)}>{tenant.status}</Badge>
              <Chip color={PLAN_COLORS[tenant.plan] ?? 'var(--color-accent-primary)'} height={20}>
                {tenant.plan}
              </Chip>
            </div>
            <span style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-mono)',
            }}>
              {tenant.slug}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexShrink: 0 }}>
            <Button
              variant={isSuspended ? 'secondary' : 'danger'}
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (isSuspended) {
                  statusMutation.mutate({ id: tenant.id, status: 'active' }, { onSuccess: invalidate });
                } else {
                  setConfirmSuspend(true);
                }
              }}
            >
              {isSuspended ? 'Activate' : 'Suspend'}
            </Button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--spacing-md)',
          paddingTop: 'var(--spacing-md)',
          borderTop: '1px solid var(--color-border-secondary)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              fontWeight: 'var(--font-weight-medium)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Plan
            </span>
            <Select
              value={tenant.plan}
              onChange={(val) => {
                planMutation.mutate({ id: tenant.id, plan: val }, { onSuccess: invalidate });
              }}
              options={PLANS.map((p) => ({
                value: p,
                label: p,
                color: PLAN_COLORS[p],
              }))}
              size="sm"
              width={140}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              fontWeight: 'var(--font-weight-medium)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Cpu size={11} />
              CPU quota
            </span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
              {tenant.quotaCpu}m
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              fontWeight: 'var(--font-weight-medium)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <MemoryStick size={11} />
              Memory quota
            </span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
              {tenant.quotaMemoryMb} MB
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              fontWeight: 'var(--font-weight-medium)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <HardDrive size={11} />
              Storage quota
            </span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
              {tenant.quotaStorageMb} MB
            </span>
          </div>
        </div>
      </div>

      {/* Members section */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          marginBottom: 'var(--spacing-md)',
        }}>
          <Users size={15} style={{ color: 'var(--color-text-tertiary)' }} />
          <span style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
          }}>
            Members
          </span>
          <Chip height={18} style={{ padding: '0 var(--spacing-xs)' }}>
            {tenant.members.length}
          </Chip>
        </div>

        <div style={{
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-primary)',
          overflow: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>User ID</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {tenant.members.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                    No members
                  </td>
                </tr>
              )}
              {tenant.members.map((m: any) => (
                <tr key={m.userId}>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    {m.userId}
                  </td>
                  <td style={tdStyle}>
                    <Badge variant={m.role === 'owner' ? 'primary' : 'default'}>{m.role}</Badge>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apps section */}
      <TenantAppsSection tenantId={tenant.id} />

      {/* Confirm suspend */}
      <ConfirmDialog
        open={confirmSuspend}
        onOpenChange={setConfirmSuspend}
        title="Suspend tenant"
        description={`This will suspend "${tenant.name}". Users will lose access until reactivated.`}
        confirmLabel="Suspend"
        destructive
        onConfirm={() => {
          statusMutation.mutate({ id: tenant.id, status: 'suspended' }, { onSuccess: invalidate });
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tenant Apps Section
// ---------------------------------------------------------------------------

function TenantAppsSection({ tenantId }: { tenantId: string }) {
  const { data: tenantApps, isLoading } = useTenantAppsAdmin(tenantId);
  const toggleMutation = useToggleTenantApp(tenantId);
  const allApps = appRegistry.getAll();

  const enabledSet = new Set(
    (tenantApps ?? []).filter(a => a.isEnabled).map(a => a.appId),
  );

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
        marginBottom: 'var(--spacing-md)',
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
        {isLoading ? (
          <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            Loading apps...
          </div>
        ) : (
          allApps.map((app, i) => {
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
                        background: '#fff',
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
          })
        )}
      </div>
    </div>
  );
}
