import { Shield, Users } from 'lucide-react';
import { useCrmPermissions, useUpdateCrmPermission, type CrmRole, type CrmRecordAccess, type CrmPermissionWithUser } from '../hooks';
import { Select } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'sales', label: 'Sales' },
  { value: 'viewer', label: 'Viewer' },
];

const ACCESS_OPTIONS = [
  { value: 'all', label: 'All records' },
  { value: 'own', label: 'Own records' },
];

const ROLE_DESCRIPTIONS: Record<CrmRole, string> = {
  admin: 'Full access to all CRM features and permissions management',
  manager: 'Full CRUD on all entities, view-only on automations',
  sales: 'CRUD on deals, contacts, activities; view-only on companies',
  viewer: 'Read-only access to all entities',
};

function getRoleBadgeVariant(role: CrmRole): 'primary' | 'success' | 'warning' | 'default' {
  switch (role) {
    case 'admin': return 'primary';
    case 'manager': return 'success';
    case 'sales': return 'warning';
    case 'viewer': return 'default';
  }
}

function PermissionRow({ perm, onUpdate }: {
  perm: CrmPermissionWithUser;
  onUpdate: (userId: string, role: CrmRole, recordAccess: CrmRecordAccess) => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 140px 160px',
      gap: 'var(--spacing-md)',
      alignItems: 'center',
      padding: 'var(--spacing-md) var(--spacing-lg)',
      borderBottom: '1px solid var(--color-border-secondary)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontSize: 'var(--font-size-md)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text-primary)',
        }}>
          {perm.userName || perm.userEmail}
        </span>
        {perm.userName && (
          <span style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
          }}>
            {perm.userEmail}
          </span>
        )}
      </div>

      <Select
        value={perm.role}
        onChange={(v) => onUpdate(perm.userId, v as CrmRole, perm.recordAccess)}
        options={ROLE_OPTIONS}
        size="sm"
      />

      <Select
        value={perm.recordAccess}
        onChange={(v) => onUpdate(perm.userId, perm.role, v as CrmRecordAccess)}
        options={ACCESS_OPTIONS}
        size="sm"
      />
    </div>
  );
}

export function PermissionsView() {
  const { data, isLoading } = useCrmPermissions();
  const updatePermission = useUpdateCrmPermission();

  const permissions = data?.permissions ?? [];

  const handleUpdate = (userId: string, role: CrmRole, recordAccess: CrmRecordAccess) => {
    updatePermission.mutate({ userId, role, recordAccess });
  };

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <Skeleton height={32} style={{ marginBottom: 'var(--spacing-md)' }} />
        <Skeleton height={48} style={{ marginBottom: 'var(--spacing-sm)' }} />
        <Skeleton height={48} style={{ marginBottom: 'var(--spacing-sm)' }} />
        <Skeleton height={48} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-lg)',
      }}>
        <Shield size={18} style={{ color: 'var(--color-accent-primary)' }} />
        <span style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
        }}>
          CRM permissions
        </span>
      </div>

      {/* Role legend */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-md)',
        background: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--spacing-xl)',
      }}>
        {(Object.entries(ROLE_DESCRIPTIONS) as [CrmRole, string][]).map(([role, desc]) => (
          <div key={role} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Badge variant={getRoleBadgeVariant(role)}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
            <span style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              lineHeight: 1.4,
            }}>
              {desc}
            </span>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 140px 160px',
        gap: 'var(--spacing-md)',
        padding: 'var(--spacing-sm) var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border-primary)',
      }}>
        <span style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>User</span>
        <span style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>Role</span>
        <span style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>Record access</span>
      </div>

      {/* Permission rows */}
      {permissions.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-md)',
          padding: 'var(--spacing-2xl)',
          color: 'var(--color-text-tertiary)',
        }}>
          <Users size={32} />
          <span style={{ fontSize: 'var(--font-size-sm)' }}>No team members found</span>
        </div>
      ) : (
        permissions.map((perm) => (
          <PermissionRow
            key={perm.userId}
            perm={perm}
            onUpdate={handleUpdate}
          />
        ))
      )}
    </div>
  );
}
