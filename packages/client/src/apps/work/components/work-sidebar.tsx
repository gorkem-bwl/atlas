import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckSquare, FolderKanban, BarChart3, LayoutGrid, Calendar, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isTenantAdmin } from '@atlas-platform/shared';
import { AppSidebar, SidebarItem, SidebarSection } from '../../../components/layout/app-sidebar';
import { useAuthStore } from '../../../stores/auth-store';

export function WorkSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const activeProjectId = sp.get('projectId');
  const activeView = sp.get('view') ?? 'dashboard';
  const { tenantRole, isSuperAdmin } = useAuthStore();
  const isAdmin = isSuperAdmin || isTenantAdmin(tenantRole);

  const go = (qs: string) => navigate(`/work${qs}`);

  return (
    <AppSidebar storageKey="atlas_work_sidebar" title="Work">
      <SidebarSection>
        <SidebarItem
          label={t('work.sidebar.dashboard')}
          icon={<BarChart3 size={15} />}
          isActive={activeView === 'dashboard' && !activeProjectId}
          onClick={() => go('')}
        />
        <SidebarItem
          label={t('work.sidebar.projects')}
          icon={<FolderKanban size={15} />}
          isActive={activeView === 'projects' || !!activeProjectId}
          onClick={() => go('?view=projects')}
        />
        <SidebarItem
          label={t('work.sidebar.board')}
          icon={<LayoutGrid size={15} />}
          isActive={activeView === 'board' && !activeProjectId}
          onClick={() => go('?view=board')}
        />
        <SidebarItem
          label={t('work.sidebar.myTasks')}
          icon={<CheckSquare size={15} />}
          isActive={activeView === 'my-tasks' && !activeProjectId}
          onClick={() => go('?view=my-tasks')}
        />
        <SidebarItem
          label={t('work.sidebar.calendar', 'Calendar')}
          icon={<Calendar size={15} />}
          isActive={activeView === 'calendar' && !activeProjectId}
          onClick={() => go('?view=calendar')}
        />
        {isAdmin && (
          <SidebarItem
            label={t('work.sidebar.reports')}
            icon={<ClipboardList size={15} />}
            isActive={activeView === 'reports' && !activeProjectId}
            onClick={() => go('?view=reports')}
          />
        )}
      </SidebarSection>
    </AppSidebar>
  );
}
