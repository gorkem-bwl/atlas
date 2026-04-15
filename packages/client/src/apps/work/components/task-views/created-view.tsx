import { useTranslation } from 'react-i18next';
import { WorkTasksView } from '../work-tasks-view';

export function CreatedView() {
  const { t } = useTranslation();
  return <WorkTasksView view="created" title={t('work.sidebar.createdByMe')} />;
}
