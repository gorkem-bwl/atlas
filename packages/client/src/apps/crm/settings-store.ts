import { create } from 'zustand';
import { api } from '../../lib/api-client';

type CrmDefaultView = 'dashboard' | 'leads' | 'pipeline' | 'deals' | 'contacts' | 'companies' | 'activities' | 'automations' | 'permissions' | 'forecast';

interface CrmSettingsState {
  defaultView: CrmDefaultView;
  setDefaultView: (view: CrmDefaultView) => void;
}

function persistCrm(key: string, value: unknown) {
  api.put('/settings', { [`crm_${key}`]: value }).catch(() => {});
}

export const useCrmSettingsStore = create<CrmSettingsState>((set) => ({
  defaultView: 'pipeline',
  setDefaultView: (defaultView) => { set({ defaultView }); persistCrm('defaultView', defaultView); },
}));
