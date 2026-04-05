import { createAppSettingsStore } from '../../lib/create-app-settings-store';

export type DrawExportQuality = 1 | 2 | 4;
export type DrawBackground = 'white' | 'light' | 'dark';
export type DrawAutoSaveInterval = 1000 | 2000 | 5000 | 10000;
export type DrawSortOrder = 'name' | 'created' | 'modified';

interface DrawSettings {
  gridMode: boolean;
  snapToGrid: boolean;
  defaultBackground: DrawBackground;
  exportQuality: DrawExportQuality;
  exportWithBackground: boolean;
  autoSaveInterval: DrawAutoSaveInterval;
  sortOrder: DrawSortOrder;
}

const { useStore: useDrawSettingsStore, useSync: useDrawSettingsSync } = createAppSettingsStore<DrawSettings>({
  defaults: {
    gridMode: false,
    snapToGrid: false,
    defaultBackground: 'white',
    exportQuality: 1,
    exportWithBackground: true,
    autoSaveInterval: 2000,
    sortOrder: 'modified',
  },
  fieldMapping: {
    gridMode: 'drawGridMode',
    snapToGrid: 'drawSnapToGrid',
    defaultBackground: 'drawDefaultBackground',
    exportQuality: 'drawExportQuality',
    exportWithBackground: 'drawExportWithBackground',
    autoSaveInterval: 'drawAutoSaveInterval',
    sortOrder: 'drawSortOrder',
  },
});

export { useDrawSettingsStore, useDrawSettingsSync };
