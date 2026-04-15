import { FileText, ExternalLink, Link, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../../../components/ui/skeleton';
import { IconButton } from '../../../components/ui/icon-button';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { FeatureEmptyState } from '../../../components/ui/feature-empty-state';
import { formatDate, formatBytes } from '../../../lib/format';
import { useToastStore } from '../../../stores/toast-store';
import { useAppActions } from '../../../hooks/use-app-permissions';
import { ROUTES } from '../../../config/routes';
import { api } from '../../../lib/api-client';
import { queryKeys } from '../../../config/query-keys';
import { useDriveItems } from '../../drive/hooks';
import { useLinkProjectFile, useUnlinkProjectFile } from '../hooks';
import type { DriveItem } from '@atlas-platform/shared';

interface ProjectDriveItem {
  id: string;
  name: string;
  size: number | null;
  mimeType: string | null;
  updatedAt: string;
}

interface Props {
  projectId: string;
}

function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: queryKeys.work.projects.projects.files(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/work/projects/${projectId}/files`);
      return (data.data?.files ?? []) as ProjectDriveItem[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

function DrivePicker({ linkedIds, onSelect }: { linkedIds: Set<string>; onSelect: (item: DriveItem) => void }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useDriveItems(null);

  const items = (data?.items ?? []).filter((item) => {
    if (linkedIds.has(item.id)) return false;
    if (item.type === 'folder') return false;
    if (search) return item.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search files…"
        size="sm"
      />
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={36} borderRadius="var(--radius-sm)" />)}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xl) 0' }}>
          No files available
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-secondary)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-secondary)'; }}
            >
              <FileText size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
              {item.size != null && (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                  {formatBytes(item.size)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectFilesTab({ projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canCreate, canDelete } = useAppActions('work');
  const { addToast } = useToastStore();
  const { data: files, isLoading } = useProjectFiles(projectId);
  const linkFile = useLinkProjectFile();
  const unlinkFile = useUnlinkProjectFile();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null);

  const linkedIds = new Set((files ?? []).map((f) => f.id));

  const handleLink = (item: DriveItem) => {
    linkFile.mutate(
      { projectId, driveItemId: item.id },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: t('work.files.linked') });
          setShowLinkModal(false);
        },
      },
    );
  };

  const handleUnlink = (fileId: string) => {
    unlinkFile.mutate(
      { projectId, driveItemId: fileId },
      {
        onSuccess: () => {
          setConfirmUnlinkId(null);
          addToast({ type: 'success', message: t('work.files.unlink') });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {[1, 2, 3].map((i) => <Skeleton key={i} height={44} borderRadius="var(--radius-md)" />)}
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
        <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
          {files && files.length > 0 ? t('work.files.count', { count: files.length }) : ''}
        </span>
        {canCreate && (
          <Button variant="secondary" size="sm" onClick={() => setShowLinkModal(true)}>
            <Link size={13} style={{ marginRight: 4 }} />
            {t('work.files.linkButton')}
          </Button>
        )}
      </div>

      {(!files || files.length === 0) ? (
        <FeatureEmptyState
          illustration="files"
          title={t('work.files.empty')}
          description={t('work.files.emptyHint')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {files.map((file) => (
            <div
              key={file.id}
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
              <FileText size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  {file.size != null ? formatBytes(file.size) : ''}{file.size != null ? ' · ' : ''}
                  {formatDate(file.updatedAt)}
                </div>
              </div>
              <IconButton
                icon={<ExternalLink size={13} />}
                label={t('work.files.openInDrive')}
                size={24}
                onClick={() => navigate(ROUTES.DRIVE)}
              />
              {canDelete && (
                <IconButton
                  icon={<Trash2 size={13} />}
                  label={t('work.files.unlink')}
                  size={24}
                  destructive
                  onClick={() => setConfirmUnlinkId(file.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link file modal */}
      <Modal open={showLinkModal} onOpenChange={setShowLinkModal}>
        <Modal.Header title={t('work.files.pickerTitle')} />
        <Modal.Body>
          <DrivePicker linkedIds={linkedIds} onSelect={handleLink} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="md" onClick={() => setShowLinkModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        open={!!confirmUnlinkId}
        onOpenChange={(open) => { if (!open) setConfirmUnlinkId(null); }}
        title={t('work.files.unlink')}
        description={t('work.files.unlinkConfirm')}
        confirmLabel={t('work.files.unlink')}
        destructive
        onConfirm={() => confirmUnlinkId && handleUnlink(confirmUnlinkId)}
      />
    </div>
  );
}
