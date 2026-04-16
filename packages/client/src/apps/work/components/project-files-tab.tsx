import { FileText, ExternalLink, Folder, ChevronRight, Trash2 } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [path, setPath] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: 'Drive' }]);
  const currentFolderId = path[path.length - 1].id;
  const { data, isLoading } = useDriveItems(currentFolderId);

  const items = (data?.items ?? []).filter((item) => {
    if (item.type !== 'folder' && linkedIds.has(item.id)) return false;
    if (search) return item.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  // folders first, then files
  const sorted = [...items].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  const enterFolder = (folder: DriveItem) => {
    setPath([...path, { id: folder.id, name: folder.name }]);
    setSearch('');
  };

  const goTo = (idx: number) => {
    setPath(path.slice(0, idx + 1));
    setSearch('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search this folder…"
        size="sm"
      />
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
        {path.map((seg, i) => (
          <span key={`${seg.id ?? 'root'}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {i > 0 && <ChevronRight size={11} />}
            {i < path.length - 1 ? (
              <button
                type="button"
                onClick={() => goTo(i)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '2px 4px', fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family)' }}
              >
                {seg.name}
              </button>
            ) : (
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)', padding: '2px 4px' }}>{seg.name}</span>
            )}
          </span>
        ))}
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={36} borderRadius="var(--radius-sm)" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xl) 0' }}>
          This folder is empty
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sorted.map((item) => {
            const isFolder = item.type === 'folder';
            return (
              <div
                key={item.id}
                onClick={() => isFolder ? enterFolder(item) : onSelect(item)}
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
                {isFolder ? (
                  <Folder size={14} style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }} />
                ) : (
                  <FileText size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
                {!isFolder && item.size != null && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                    {formatBytes(item.size)}
                  </span>
                )}
                {isFolder && (
                  <ChevronRight size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
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
