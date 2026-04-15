import { useNavigate, useSearchParams } from 'react-router-dom';
import { Inbox, UserCheck, Edit, Layers, FolderKanban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppSidebar, SidebarItem, SidebarSection } from '../../../components/layout/app-sidebar';
import { useTaskProjectList } from '../hooks';

export function WorkSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const activeProjectId = sp.get('projectId');
  const activeView = sp.get('view') ?? 'my';
  const { data: projectsData } = useTaskProjectList();
  const projects = projectsData?.projects ?? [];

  const go = (qs: string) => navigate(`/work${qs}`);

  return (
    <AppSidebar storageKey="atlas_work_sidebar" title="Work">
      <SidebarSection>
        <SidebarItem
          label={t('work.sidebar.myTasks')}
          icon={<Inbox size={15} />}
          isActive={activeView === 'my' && !activeProjectId}
          onClick={() => go('')}
        />
        <SidebarItem
          label={t('work.sidebar.assignedToMe')}
          icon={<UserCheck size={15} />}
          isActive={activeView === 'assigned' && !activeProjectId}
          onClick={() => go('?view=assigned')}
        />
        <SidebarItem
          label={t('work.sidebar.createdByMe')}
          icon={<Edit size={15} />}
          isActive={activeView === 'created' && !activeProjectId}
          onClick={() => go('?view=created')}
        />
        <SidebarItem
          label={t('work.sidebar.allTasks')}
          icon={<Layers size={15} />}
          isActive={activeView === 'all' && !activeProjectId}
          onClick={() => go('?view=all')}
        />
      </SidebarSection>
      {projects.length > 0 && (
        <SidebarSection title={t('work.sidebar.projects')}>
          {projects.map((p) => (
            <SidebarItem
              key={p.id}
              label={p.title}
              icon={<FolderKanban size={15} />}
              isActive={activeProjectId === p.id}
              onClick={() => go(`?projectId=${p.id}`)}
            />
          ))}
        </SidebarSection>
      )}
    </AppSidebar>
  );
}
