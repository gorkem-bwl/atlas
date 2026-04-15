import { FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../../../components/ui/skeleton';
import { IconButton } from '../../../components/ui/icon-button';
import { FeatureEmptyState } from '../../../components/ui/feature-empty-state';
import { formatDate, formatBytes } from '../../../lib/format';
import { ROUTES } from '../../../config/routes';
import { api } from '../../../lib/api-client';
import { queryKeys } from '../../../config/query-keys';

interface DriveItem {
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
      return (data.data?.files ?? []) as DriveItem[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function ProjectFilesTab({ projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: files, isLoading } = useProjectFiles(projectId);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {[1, 2, 3].map((i) => <Skeleton key={i} height={44} borderRadius="var(--radius-md)" />)}
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <FeatureEmptyState
        illustration="files"
        title={t('work.files.empty')}
        description={t('work.files.emptyHint')}
      />
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxWidth: 860 }}>
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)' }}>
        {t('work.files.count', { count: files.length })}
      </span>

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
          </div>
        ))}
      </div>
    </div>
  );
}
