import { create } from 'zustand';
import { api } from '../../lib/api-client';

type HrDefaultView = 'dashboard' | 'employees' | 'departments' | 'org-chart' | 'time-off';

interface HrSettingsState {
  defaultView: HrDefaultView;
  showDepartmentInList: boolean;
  setDefaultView: (view: HrDefaultView) => void;
  setShowDepartmentInList: (value: boolean) => void;
}

function persistHr(key: string, value: unknown) {
  api.put('/settings', { [`hr_${key}`]: value }).catch(() => {});
}

export const useHrSettingsStore = create<HrSettingsState>((set) => ({
  defaultView: 'employees',
  showDepartmentInList: true,
  setDefaultView: (defaultView) => { set({ defaultView }); persistHr('defaultView', defaultView); },
  setShowDepartmentInList: (showDepartmentInList) => { set({ showDepartmentInList }); persistHr('showDepartmentInList', showDepartmentInList); },
}));
