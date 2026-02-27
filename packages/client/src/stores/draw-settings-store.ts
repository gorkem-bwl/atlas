import { create } from 'zustand';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';

export type DrawExportQuality = 1 | 2 | 4;
export type DrawBackground = 'white' | 'light' | 'dark';
export type DrawAutoSaveInterval = 1000 | 2000 | 5000 | 10000;
export type DrawSortOrder = 'name' | 'created' | 'modified';

interface DrawSettingsState {
  // Canvas
  gridMode: boolean;
  snapToGrid: boolean;
  defaultBackground: DrawBackground;

  // Export
  exportQuality: DrawExportQuality;
  exportWithBackground: boolean;

  // Behavior
  autoSaveInterval: DrawAutoSaveInterval;
  sortOrder: DrawSortOrder;

  _hydrated: boolean;

  // Setters
  setGridMode: (value: boolean) => void;
  setSnapToGrid: (value: boolean) => void;
  setDefaultBackground: (value: DrawBackground) => void;
  setExportQuality: (value: DrawExportQuality) => void;
  setExportWithBackground: (value: boolean) => void;
  setAutoSaveInterval: (value: DrawAutoSaveInterval) => void;
  setSortOrder: (value: DrawSortOrder) => void;
  _hydrateFromServer: (data: Record<string, unknown>) => void;
}

function persistToServer(serverKey: string, value: unknown) {
  api.put('/settings', { [serverKey]: value }).catch(() => {});
}

export const useDrawSettingsStore = create<DrawSettingsState>()((set) => ({
  gridMode: false,
  snapToGrid: false,
  defaultBackground: 'white',
  exportQuality: 1,
  exportWithBackground: true,
  autoSaveInterval: 2000,
  sortOrder: 'modified',
  _hydrated: false,

  setGridMode: (gridMode) => { set({ gridMode }); persistToServer('drawGridMode', gridMode); },
  setSnapToGrid: (snapToGrid) => { set({ snapToGrid }); persistToServer('drawSnapToGrid', snapToGrid); },
  setDefaultBackground: (defaultBackground) => { set({ defaultBackground }); persistToServer('drawDefaultBackground', defaultBackground); },
  setExportQuality: (exportQuality) => { set({ exportQuality }); persistToServer('drawExportQuality', exportQuality); },
  setExportWithBackground: (exportWithBackground) => { set({ exportWithBackground }); persistToServer('drawExportWithBackground', exportWithBackground); },
  setAutoSaveInterval: (autoSaveInterval) => { set({ autoSaveInterval }); persistToServer('drawAutoSaveInterval', autoSaveInterval); },
  setSortOrder: (sortOrder) => { set({ sortOrder }); persistToServer('drawSortOrder', sortOrder); },
  _hydrateFromServer: (data: Record<string, unknown>) => {
    const map: Record<string, string> = {
      drawGridMode: 'gridMode',
      drawSnapToGrid: 'snapToGrid',
      drawDefaultBackground: 'defaultBackground',
      drawExportQuality: 'exportQuality',
      drawExportWithBackground: 'exportWithBackground',
      drawAutoSaveInterval: 'autoSaveInterval',
      drawSortOrder: 'sortOrder',
    };
    const patch: Record<string, unknown> = {};
    for (const [serverKey, localKey] of Object.entries(map)) {
      if (serverKey in data && data[serverKey] !== undefined && data[serverKey] !== null) {
        patch[localKey] = data[serverKey];
      }
    }
    set({ ...patch, _hydrated: true } as Partial<DrawSettingsState>);
  },
}));

export function useDrawSettingsSync() {
  const hydrateFromServer = useDrawSettingsStore((s) => s._hydrateFromServer);
  const hydrated = useDrawSettingsStore((s) => s._hydrated);

  const { data: serverSettings } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as Record<string, unknown> | null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (serverSettings && !hydrated) {
      hydrateFromServer(serverSettings);
    }
  }, [serverSettings, hydrated, hydrateFromServer]);
}
