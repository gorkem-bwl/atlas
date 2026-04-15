import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContentArea } from '../../../components/ui/content-area';
import { useWorkProject } from '../hooks';
import type { WorkProject } from '../hooks';
import { ProjectOverviewTab } from './project-overview-tab';
import { ProjectTasksTab } from './project-tasks-tab';
import { ProjectFinancialsTab } from './project-financials-tab';
import { ProjectMembersTab } from './project-members-tab';
import { ProjectTimeTab } from './project-time-tab';
import { ProjectFilesTab } from './project-files-tab';

const TABS = ['overview', 'tasks', 'financials', 'members', 'time', 'files'] as const;
type TabId = typeof TABS[number];

interface Props {
  projectId: string;
}

export function ProjectDetailPage({ projectId }: Props) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as TabId | null) ?? 'overview';
  const { data: project, isLoading } = useWorkProject(projectId);

  const tabLabels: Record<TabId, string> = {
    overview: t('work.tabs.overview'),
    tasks: t('work.tabs.tasks'),
    financials: t('work.tabs.financials'),
    members: t('work.tabs.members'),
    time: t('work.tabs.time'),
    files: t('work.tabs.files'),
  };

  if (isLoading) {
    return (
      <ContentArea title="">
        <div style={{ padding: 32, color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          {t('work.loading')}
        </div>
      </ContentArea>
    );
  }

  if (!project) {
    return (
      <ContentArea>
        <div style={{ padding: 32, color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          {t('work.projectNotFound')}
        </div>
      </ContentArea>
    );
  }

  const setTab = (next: TabId) => {
    const params = new URLSearchParams();
    params.set('projectId', projectId);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  return (
    <ContentArea
      headerSlot={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: '0 var(--spacing-lg)', width: '100%', height: '100%' }}>
          <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', flexShrink: 0 }}>
            {project.name}
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map((id) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-sm)',
                  color: tab === id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  fontWeight: tab === id ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  borderBottom: tab === id ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {tabLabels[id]}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {tab === 'overview' && <ProjectOverviewTab project={project as WorkProject} />}
      {tab === 'tasks' && <ProjectTasksTab projectId={projectId} />}
      {tab === 'financials' && <ProjectFinancialsTab projectId={projectId} project={project} />}
      {tab === 'members' && <ProjectMembersTab projectId={projectId} />}
      {tab === 'time' && <ProjectTimeTab projectId={projectId} />}
      {tab === 'files' && <ProjectFilesTab projectId={projectId} />}
    </ContentArea>
  );
}
