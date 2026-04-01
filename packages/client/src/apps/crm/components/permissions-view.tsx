import { useState, useMemo, type CSSProperties } from 'react';
import { Shield, Users, Check, X, Eye, Plus, Pencil, Trash2, Info, Crown, Briefcase, TrendingUp, EyeIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useCrmPermissions,
  useUpdateCrmPermission,
  type CrmRole,
  type CrmRecordAccess,
  type CrmPermissionWithUser,
  type CrmEntity,
  type CrmOperation,
  canAccess,
} from '../hooks';
import { Select } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { Avatar } from '../../../components/ui/avatar';
import { Tooltip } from '../../../components/ui/tooltip';
import { StatusDot } from '../../../components/ui/status-dot';
import { StatCard } from '../../../components/ui/stat-card';

// ─── Constants ──────────────────────────────────────────────────────

const ROLES: CrmRole[] = ['admin', 'manager', 'sales', 'viewer'];

const ENTITIES: { id: CrmEntity; label: string; icon: typeof Eye }[] = [
  { id: 'deals', label: 'Deals', icon: Eye },
  { id: 'contacts', label: 'Contacts', icon: Eye },
  { id: 'companies', label: 'Companies', icon: Eye },
  { id: 'activities', label: 'Activities', icon: Eye },
  { id: 'workflows', label: 'Automations', icon: Eye },
  { id: 'dashboard', label: 'Dashboard', icon: Eye },
];

const OPERATIONS: { id: CrmOperation; label: string; icon: typeof Eye }[] = [
  { id: 'view', label: 'View', icon: Eye },
  { id: 'create', label: 'Create', icon: Plus },
  { id: 'update', label: 'Edit', icon: Pencil },
  { id: 'delete', label: 'Delete', icon: Trash2 },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'sales', label: 'Sales' },
  { value: 'viewer', label: 'Viewer' },
];

const ACCESS_OPTIONS = [
  { value: 'all', label: 'All records' },
  { value: 'own', label: 'Own records only' },
];

const ROLE_COLORS: Record<CrmRole, string> = {
  admin: '#7c3aed',
  manager: '#2563eb',
  sales: '#f59e0b',
  viewer: '#6b7280',
};

const ROLE_DESCRIPTIONS: Record<CrmRole, string> = {
  admin: 'Full access to all CRM features including permissions and automations',
  manager: 'Full CRUD on all entities, view-only on automations',
  sales: 'Manage deals, contacts, and activities. View-only on companies',
  viewer: 'Read-only access to all entities',
};

const ROLE_ICONS: Record<CrmRole, typeof Crown> = {
  admin: Crown,
  manager: Briefcase,
  sales: TrendingUp,
  viewer: EyeIcon,
};

// ─── Permission Matrix Cell ─────────────────────────────────────────

function MatrixCell({ allowed }: { allowed: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 24,
      height: 24,
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: allowed ? 'var(--color-success)' : 'var(--color-border-secondary)',
      }} />
    </div>
  );
}

// ─── Permission Matrix (Odoo/Salesforce style) ──────────────────────

function PermissionMatrix() {
  const [hoveredRole, setHoveredRole] = useState<CrmRole | null>(null);

  return (
    <div style={{
      border: '1px solid var(--color-border-secondary)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 'var(--spacing-xl)',
    }}>
      {/* Header row: Entity names across the top */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '120px repeat(6, 1fr)',
        borderBottom: '1px solid var(--color-border-secondary)',
        background: 'var(--color-bg-secondary)',
      }}>
        <div style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          Role
        </div>
        {ENTITIES.map((entity) => (
          <div
            key={entity.id}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-xs)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
            }}
          >
            {entity.label}
          </div>
        ))}
      </div>

      {/* Operation sub-header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '120px repeat(6, 1fr)',
        borderBottom: '1px solid var(--color-border-primary)',
        background: 'var(--color-bg-secondary)',
      }}>
        <div />
        {ENTITIES.map((entity) => (
          <div key={entity.id} style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            padding: '2px var(--spacing-xs)',
          }}>
            {OPERATIONS.map((op) => {
              const Icon = op.icon;
              return (
                <Tooltip key={op.id} content={op.label}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 20,
                  }}>
                    <Icon size={10} style={{ color: 'var(--color-text-tertiary)', opacity: 0.6 }} />
                  </div>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>

      {/* Role rows */}
      {ROLES.map((role, idx) => (
        <div
          key={role}
          onMouseEnter={() => setHoveredRole(role)}
          onMouseLeave={() => setHoveredRole(null)}
          style={{
            display: 'grid',
            gridTemplateColumns: '120px repeat(6, 1fr)',
            borderBottom: idx < ROLES.length - 1 ? '1px solid var(--color-border-secondary)' : 'none',
            background: hoveredRole === role ? 'var(--color-surface-hover)' : 'transparent',
            transition: 'background var(--transition-fast)',
          }}
        >
          {/* Role name + color dot */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
          }}>
            <StatusDot color={ROLE_COLORS[role]} size={8} />
            <span style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
              color: 'var(--color-text-primary)',
              textTransform: 'capitalize',
            }}>
              {role}
            </span>
          </div>

          {/* CRUD cells per entity */}
          {ENTITIES.map((entity) => (
            <div key={entity.id} style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              padding: 'var(--spacing-xs)',
              alignItems: 'center',
            }}>
              {OPERATIONS.map((op) => (
                <MatrixCell key={op.id} allowed={canAccess(role, entity.id, op.id)} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── User Permission Row ────────────────────────────────────────────

function UserPermissionRow({ perm, onUpdate }: {
  perm: CrmPermissionWithUser;
  onUpdate: (userId: string, role: CrmRole, recordAccess: CrmRecordAccess) => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 140px 170px',
      gap: 'var(--spacing-md)',
      alignItems: 'center',
      padding: 'var(--spacing-sm) var(--spacing-lg)',
      borderBottom: '1px solid var(--color-border-secondary)',
    }}>
      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: 0 }}>
        <Avatar name={perm.userName} email={perm.userEmail} size={32} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {perm.userName || perm.userEmail}
          </div>
          {perm.userName && (
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {perm.userEmail}
            </div>
          )}
        </div>
      </div>

      {/* Role selector */}
      <Select
        value={perm.role}
        onChange={(v) => onUpdate(perm.userId, v as CrmRole, perm.recordAccess)}
        options={ROLE_OPTIONS}
        size="sm"
      />

      {/* Record access selector */}
      <Select
        value={perm.recordAccess}
        onChange={(v) => onUpdate(perm.userId, perm.role, v as CrmRecordAccess)}
        options={ACCESS_OPTIONS}
        size="sm"
      />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function PermissionsView() {
  const { t } = useTranslation();
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
        <Skeleton height={200} style={{ marginBottom: 'var(--spacing-xl)' }} />
        <Skeleton height={48} style={{ marginBottom: 'var(--spacing-sm)' }} />
        <Skeleton height={48} style={{ marginBottom: 'var(--spacing-sm)' }} />
        <Skeleton height={48} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)', fontFamily: 'var(--font-family)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-sm)',
      }}>
        <Shield size={18} style={{ color: 'var(--color-accent-primary)' }} />
        <span style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
          color: 'var(--color-text-primary)',
        }}>
          {t('crm.permissions.title', 'CRM permissions')}
        </span>
      </div>
      <p style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-tertiary)',
        marginBottom: 'var(--spacing-xl)',
        lineHeight: 'var(--line-height-normal)',
      }}>
        {t('crm.permissions.description', 'Control what each role can do. Assign roles to team members below.')}
      </p>

      {/* Role descriptions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-xl)',
      }}>
        {ROLES.map((role) => (
          <StatCard
            key={role}
            label={role}
            value={role.charAt(0).toUpperCase() + role.slice(1)}
            subtitle={ROLE_DESCRIPTIONS[role]}
            color={ROLE_COLORS[role]}
            icon={ROLE_ICONS[role]}
          />
        ))}
      </div>

      {/* CRUD Permission Matrix */}
      <div style={{
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 'var(--spacing-sm)',
      }}>
        {t('crm.permissions.matrix', 'Permission matrix')}
      </div>
      <PermissionMatrix />

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-xl)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Eye size={10} /> View
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={10} /> Create
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Pencil size={10} /> Edit
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Trash2 size={10} /> Delete
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MatrixCell allowed={true} /> Allowed
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MatrixCell allowed={false} /> Denied
        </div>
      </div>

      {/* Team members section */}
      <div style={{
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 'var(--spacing-sm)',
      }}>
        {t('crm.permissions.teamMembers', 'Team member assignments')}
      </div>

      <div style={{
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 170px',
          gap: 'var(--spacing-md)',
          padding: 'var(--spacing-sm) var(--spacing-lg)',
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border-secondary)',
        }}>
          <span style={headerStyle}>User</span>
          <span style={headerStyle}>Role</span>
          <span style={headerStyle}>Record access</span>
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
            <span style={{ fontSize: 'var(--font-size-sm)' }}>
              {t('crm.permissions.noMembers', 'No team members found')}
            </span>
          </div>
        ) : (
          permissions.map((perm) => (
            <UserPermissionRow
              key={perm.userId}
              perm={perm}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}

const headerStyle: CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-medium)',
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
