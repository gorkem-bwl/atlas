import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { Modal } from '../../../components/ui/modal';
import { formatBytes } from '../../../lib/format';
import { startImpersonation } from '../impersonation';

interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'active' | 'suspended' | 'trial';
  storageQuotaBytes: number;
  memberCount: number;
  createdAt: string;
}

interface TenantMember {
  userId: string;
  name: string | null;
  email: string | null;
  provider: string | null;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  isSuperAdmin: boolean;
}

interface TenantDetail extends AdminTenant {
  members: TenantMember[];
}

export function TenantsView() {
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: async () => {
      const { data } = await api.get('/admin/tenants');
      return data.data as AdminTenant[];
    },
    staleTime: 30_000,
  });

  const detail = useQuery({
    queryKey: ['admin', 'tenant-detail', detailId],
    enabled: !!detailId,
    queryFn: async () => {
      const { data } = await api.get(`/admin/tenants/${detailId}/detail`);
      return data.data as TenantDetail;
    },
  });

  const impersonate = useMutation({
    mutationFn: async (tenantId: string) => {
      const { data } = await api.post(`/admin/tenants/${tenantId}/impersonate`);
      return data.data as { token: string; tenantName: string; tenantSlug: string };
    },
    onSuccess: (d) => {
      startImpersonation(d.token, { name: d.tenantName, slug: d.tenantSlug });
      window.location.href = '/';
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>
      <div>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          All tenants
        </h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>
          Every organization on this Atlas instance. Super-admin view.
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} style={{ height: 44 }} />)}
        </div>
      ) : !data || data.length === 0 ? (
        <div style={{ color: 'var(--color-text-tertiary)', padding: 40, textAlign: 'center' }}>No tenants.</div>
      ) : (
        <div style={{
          border: '1px solid var(--color-border-primary)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: 'var(--color-bg-primary)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)', textAlign: 'left' }}>
                <th style={th}>Name</th>
                <th style={th}>Slug</th>
                <th style={th}>Plan</th>
                <th style={th}>Status</th>
                <th style={th}>Members</th>
                <th style={th}>Storage quota</th>
                <th style={th}>Created</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} style={{ borderTop: '1px solid var(--color-border-secondary)', cursor: 'pointer' }} onClick={() => setDetailId(t.id)}>
                  <td style={td}><strong>{t.name}</strong></td>
                  <td style={{ ...td, color: 'var(--color-text-secondary)' }}>{t.slug}</td>
                  <td style={td}><Badge variant="default">{t.plan}</Badge></td>
                  <td style={td}>
                    <Badge variant={t.status === 'active' ? 'success' : t.status === 'suspended' ? 'error' : 'warning'}>
                      {t.status}
                    </Badge>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>{t.memberCount}</td>
                  <td style={{ ...td, color: 'var(--color-text-secondary)' }}>{formatBytes(t.storageQuotaBytes)}</td>
                  <td style={{ ...td, color: 'var(--color-text-tertiary)' }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td style={td} onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={impersonate.isPending}
                      onClick={() => impersonate.mutate(t.id)}
                    >
                      Open as this tenant
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)} width={720} title="Tenant detail">
        <Modal.Header
          title={detail.data?.name ?? 'Loading…'}
          subtitle={detail.data ? `${detail.data.slug} · ${detail.data.plan} · ${detail.data.status}` : undefined}
        />
        <Modal.Body>
          {detail.isLoading || !detail.data ? (
            <Skeleton style={{ height: 200 }} />
          ) : (
            <>
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text-secondary)' }}>
                Members ({detail.data.members.length})
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)', textAlign: 'left' }}>
                    <th style={th}>Name</th>
                    <th style={th}>Email</th>
                    <th style={th}>Role</th>
                    <th style={th}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.data.members.map((m) => (
                    <tr key={m.userId} style={{ borderTop: '1px solid var(--color-border-secondary)' }}>
                      <td style={td}>
                        <strong>{m.name ?? '—'}</strong>
                        {m.isSuperAdmin && <span style={{ marginLeft: 8 }}><Badge variant="primary">super-admin</Badge></span>}
                      </td>
                      <td style={{ ...td, color: 'var(--color-text-secondary)' }}>{m.email ?? '—'}</td>
                      <td style={td}>
                        <Badge variant={m.role === 'owner' ? 'success' : 'default'}>{m.role}</Badge>
                      </td>
                      <td style={{ ...td, color: 'var(--color-text-tertiary)' }}>
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

const th = { padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' as const, letterSpacing: 0.3 };
const td = { padding: '10px 14px', color: 'var(--color-text-primary)' };
