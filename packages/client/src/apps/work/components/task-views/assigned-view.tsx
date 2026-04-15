import { useTranslation } from 'react-i18next';
import { WorkTasksView } from '../work-tasks-view';

export function AssignedView() {
  const { t } = useTranslation();
  return <WorkTasksView view="assigned" title={t('work.sidebar.assignedToMe')} />;
}
