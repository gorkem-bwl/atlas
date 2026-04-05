import { createAppSettingsStore } from '../../lib/create-app-settings-store';

export type CrmDefaultView = 'dashboard' | 'leads' | 'pipeline' | 'deals' | 'contacts' | 'companies' | 'activities' | 'automations' | 'permissions' | 'forecast';

interface CrmSettings {
  defaultView: CrmDefaultView;
}

const { useStore: useCrmSettingsStore, useSync: useCrmSettingsSync } = createAppSettingsStore<CrmSettings>({
  defaults: { defaultView: 'pipeline' },
  fieldMapping: { defaultView: 'crm_defaultView' },
});

export { useCrmSettingsStore, useCrmSettingsSync };
