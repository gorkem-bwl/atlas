import { useTranslation } from 'react-i18next';
import { WorkTasksView } from '../work-tasks-view';

export function MyTasksView() {
  const { t } = useTranslation();
  return <WorkTasksView view="my" title={t('work.sidebar.myTasks')} />;
}
