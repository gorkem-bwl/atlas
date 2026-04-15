import { Users, UserPlus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectMembers, useAddProjectMember, useRemoveProjectMember } from '../hooks';
import { useTenantUsers } from '../../../hooks/use-platform';
import { useAuthStore } from '../../../stores/auth-store';
import { useToastStore } from '../../../stores/toast-store';
import { useAppActions } from '../../../hooks/use-app-permissions';
import { Avatar } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { IconButton } from '../../../components/ui/icon-button';
import { Modal } from '../../../components/ui/modal';
import { Skeleton } from '../../../components/ui/skeleton';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { formatDate, formatCurrency } from '../../../lib/format';

interface Props {
  projectId: string;
}

export function ProjectMembersTab({ projectId }: Props) {
  const { t } = useTranslation();
  const { canCreate, canDelete } = useAppActions('work');
  const tenantId = useAuthStore((s) => s.tenantId);
  const { addToast } = useToastStore();
  const { data: members, isLoading } = useProjectMembers(projectId);
  const { data: tenantUsers } = useTenantUsers(tenantId ?? undefined);
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const existingUserIds = new Set((members ?? []).map((m) => m.userId));

  const availableUsers = (tenantUsers ?? []).filter((u) => !existingUserIds.has(u.userId));

  const handleAdd = () => {
    if (!selectedUserId) return;
    addMember.mutate(
      { projectId, userId: selectedUserId, hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: t('work.members.added') });
          setShowAddModal(false);
          setSelectedUserId('');
          setHourlyRate('');
        },
      },
    );
  };

  const handleRemove = (memberId: string) => {
    removeMember.mutate(
      { projectId, memberId },
      {
        onSuccess: () => {
          setConfirmRemoveId(null);
          addToast({ type: 'success', message: t('work.members.remove') });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {[1, 2, 3].map((i) => <Skeleton key={i} height={48} borderRadius="var(--radius-md)" />)}
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
        <Users size={15} style={{ color: 'var(--color-text-tertiary)' }} />
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', flex: 1 }}>
          {(members?.length ?? 0)} {(members?.length ?? 0) === 1 ? 'member' : 'members'}
        </span>
        {canCreate && (
          <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
            <UserPlus size={13} style={{ marginRight: 4 }} />
            {t('work.members.add')}
          </Button>
        )}
      </div>

      {(!members || members.length === 0) ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)', color: 'var(--color-text-tertiary)', padding: 'var(--spacing-2xl) 0' }}>
          <Users size={32} />
          <span style={{ fontSize: 'var(--font-size-sm)' }}>No members added yet</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {members.map((member) => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-secondary)',
              }}
            >
              <Avatar name={member.userName || member.userEmail || 'Unknown'} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.userName || 'Unknown user'}
                </div>
                {member.userEmail && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.userEmail}
                  </div>
                )}
              </div>
              {member.hourlyRate != null && (
                <Badge variant="default">{formatCurrency(member.hourlyRate)}/h</Badge>
              )}
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                Joined {formatDate(member.createdAt)}
              </span>
              {canDelete && (
                <IconButton
                  icon={<Trash2 size={13} />}
                  label={t('work.members.remove')}
                  size={24}
                  destructive
                  onClick={() => setConfirmRemoveId(member.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add member modal */}
      <Modal open={showAddModal} onOpenChange={setShowAddModal}>
        <Modal.Header title={t('work.members.add')} />
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                {t('work.members.selectUser')}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-primary)',
                  background: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                }}
              >
                <option value="">— {t('work.members.selectUser')} —</option>
                {availableUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>{u.name || u.email}</option>
                ))}
              </select>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              label={t('work.members.hourlyRateLabel')}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="0.00"
              size="md"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="md" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleAdd}
            disabled={!selectedUserId || addMember.isPending}
          >
            {t('work.members.add')}
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        open={!!confirmRemoveId}
        onOpenChange={(open) => { if (!open) setConfirmRemoveId(null); }}
        title={t('work.members.remove')}
        description={t('work.members.removeConfirm')}
        confirmLabel={t('work.members.remove')}
        destructive
        onConfirm={() => confirmRemoveId && handleRemove(confirmRemoveId)}
      />
    </div>
  );
}
