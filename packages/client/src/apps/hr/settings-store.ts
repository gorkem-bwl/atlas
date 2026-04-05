import { createAppSettingsStore } from '../../lib/create-app-settings-store';

export type HrDefaultView = 'dashboard' | 'employees' | 'departments' | 'org-chart' | 'time-off';

interface HrSettings {
  defaultView: HrDefaultView;
  showDepartmentInList: boolean;
}

const { useStore: useHrSettingsStore, useSync: useHrSettingsSync } = createAppSettingsStore<HrSettings>({
  defaults: {
    defaultView: 'employees',
    showDepartmentInList: true,
  },
  fieldMapping: {
    defaultView: 'hr_defaultView',
    showDepartmentInList: 'hr_showDepartmentInList',
  },
});

export { useHrSettingsStore, useHrSettingsSync };
