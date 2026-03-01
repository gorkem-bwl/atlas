import { useState } from 'react';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { useAppAssignments, useAssignUser, useUpdateAssignment, useRemoveAssignment } from '../../hooks/use-platform';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { AppRole } from '@atlasmail/shared';

interface AppAccessPanelProps {
  tenantId: string;
  installationId: string;
  /** Tenant members available for assignment */
  tenantMembers: { userId: string; role: string; email?: string; name?: string }[];
}

const ROLE_OPTIONS: AppRole[] = ['admin', 'member', 'viewer'];

const roleVariant = (role: string) => {
  if (role === 'admin') return 'primary' as const;
  if (role === 'viewer') return 'warning' as const;
  return 'default' as const;
};

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

export function AppAccessPanel({ tenantId, installationId, tenantMembers }: AppAccessPanelProps) {
  const { data: assignments = [], isLoading } = useAppAssignments(tenantId, installationId);
  const assignMutation = useAssignUser(tenantId, installationId);
  const updateMutation = useUpdateAssignment(tenantId, installationId);
  const removeMutation = useRemoveAssignment(tenantId, installationId);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('member');

  const assignedUserIds = new Set(assignments.map((a) => a.userId));
  const unassignedMembers = tenantMembers.filter((m) => !assignedUserIds.has(m.userId));

  const handleAssign = () => {
    if (!selectedUserId) return;
    assignMutation.mutate(
      { userId: selectedUserId, appRole: selectedRole },
      { onSuccess: () => setSelectedUserId('') },
    );
  };

  if (isLoading) {
    return (
      <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-md)' }}>
        Loading assignments...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
      }}>
        <Shield size={15} style={{ color: 'var(--color-text-tertiary)' }} />
        <span style={{
          fontSize: 'var(--font-size-md)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
        }}>
          App access
        </span>
        <Badge variant="default">{assignments.length}</Badge>
      </div>

      {/* Assign user form */}
      {unassignedMembers.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          flexWrap: 'wrap',
        }}>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{
              padding: '5px 8px',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              minWidth: 200,
              height: 34,
            }}
          >
            <option value="">Select a member...</option>
            {unassignedMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.email || m.name || m.userId.slice(0, 8)}
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as AppRole)}
            style={{
              padding: '5px 8px',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              height: 34,
            }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <Button
            size="sm"
            variant="secondary"
            icon={<UserPlus size={14} />}
            disabled={!selectedUserId || assignMutation.isPending}
            onClick={handleAssign}
          >
            Assign
          </Button>
        </div>
      )}

      {/* Assignments table */}
      <div style={{
        background: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-primary)',
        overflow: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Assigned</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 && (
              <tr>
                <td colSpan={4} style={{
                  ...tdStyle,
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  padding: 'var(--spacing-xl)',
                }}>
                  No users assigned to this app yet
                </td>
              </tr>
            )}
            {assignments.map((a) => (
              <tr key={a.id}>
                <td style={{
                  ...tdStyle,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                }}>
                  {a.email || a.name || a.userId.slice(0, 8)}
                </td>
                <td style={tdStyle}>
                  <select
                    value={a.appRole}
                    onChange={(e) => {
                      updateMutation.mutate({ userId: a.userId, appRole: e.target.value as AppRole });
                    }}
                    disabled={updateMutation.isPending}
                    style={{
                      padding: '3px 6px',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-elevated)',
                      color: 'var(--color-text-primary)',
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'var(--font-family)',
                      cursor: 'pointer',
                    }}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>
                  {new Date(a.createdAt).toLocaleDateString()}
                </td>
                <td style={tdStyle}>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 size={13} />}
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(a.userId)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
