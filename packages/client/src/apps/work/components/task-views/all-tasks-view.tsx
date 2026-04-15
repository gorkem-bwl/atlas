import { useTranslation } from 'react-i18next';
import { WorkTasksView } from '../work-tasks-view';

export function AllTasksView() {
  const { t } = useTranslation();
  return <WorkTasksView view="all" title={t('work.sidebar.allTasks')} />;
}
