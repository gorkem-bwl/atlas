import { createAppSettingsHook } from '../../lib/create-app-settings-store';
import type { TablesDefaultView, TablesDefaultSort, DateFormat } from '@atlas-platform/shared';

export type { TablesDefaultView, TablesDefaultSort, DateFormat };

export interface TablesSettings {
  defaultView: TablesDefaultView;
  defaultSort: TablesDefaultSort;
  showFieldTypeIcons: boolean;
  defaultRowCount: number;
  includeRowIdsInExport: boolean;
  dateFormat: DateFormat;
  currencySymbol: string;
  timezone: string;
}

export const useTablesSettingsStore = createAppSettingsHook<TablesSettings>({
  defaults: {
    defaultView: 'grid',
    defaultSort: 'none',
    showFieldTypeIcons: true,
    defaultRowCount: 3,
    includeRowIdsInExport: false,
    dateFormat: 'MM/DD/YYYY',
    currencySymbol: '$',
    timezone: '',
  },
  fieldMapping: {
    defaultView: 'tablesDefaultView',
    defaultSort: 'tablesDefaultSort',
    showFieldTypeIcons: 'tablesShowFieldTypeIcons',
    defaultRowCount: 'tablesDefaultRowCount',
    includeRowIdsInExport: 'tablesIncludeRowIdsInExport',
    dateFormat: 'dateFormat',
    currencySymbol: 'currencySymbol',
    timezone: 'timezone',
  },
});
