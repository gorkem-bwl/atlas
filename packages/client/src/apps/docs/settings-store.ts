import { create } from 'zustand';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../config/query-keys';

export type DocFontStyle = 'default' | 'serif' | 'mono';
export type DocSidebarDefault = 'tree' | 'favorites' | 'recent';

interface DocSettingsState {
  // Editor
  fontStyle: DocFontStyle;
  smallText: boolean;
  fullWidth: boolean;
  spellCheck: boolean;

  // Startup
  openLastVisited: boolean;
  sidebarDefault: DocSidebarDefault;

  _hydrated: boolean;

  // Setters
  setFontStyle: (style: DocFontStyle) => void;
  setSmallText: (value: boolean) => void;
  setFullWidth: (value: boolean) => void;
  setSpellCheck: (value: boolean) => void;
  setOpenLastVisited: (value: boolean) => void;
  setSidebarDefault: (section: DocSidebarDefault) => void;
  _hydrateFromServer: (data: Record<string, unknown>) => void;
}

function persistToServer(serverKey: string, value: unknown) {
  api.put('/settings', { [serverKey]: value }).catch(() => {});
}

export const useDocSettingsStore = create<DocSettingsState>()((set) => ({
  fontStyle: 'default',
  smallText: false,
  fullWidth: false,
  spellCheck: true,
  openLastVisited: true,
  sidebarDefault: 'tree',
  _hydrated: false,

  setFontStyle: (fontStyle) => { set({ fontStyle }); persistToServer('docsFontStyle', fontStyle); },
  setSmallText: (smallText) => { set({ smallText }); persistToServer('docsSmallText', smallText); },
  setFullWidth: (fullWidth) => { set({ fullWidth }); persistToServer('docsFullWidth', fullWidth); },
  setSpellCheck: (spellCheck) => { set({ spellCheck }); persistToServer('docsSpellCheck', spellCheck); },
  setOpenLastVisited: (openLastVisited) => { set({ openLastVisited }); persistToServer('docsOpenLastVisited', openLastVisited); },
  setSidebarDefault: (sidebarDefault) => { set({ sidebarDefault }); persistToServer('docsSidebarDefault', sidebarDefault); },
  _hydrateFromServer: (data: Record<string, unknown>) => {
    const map: Record<string, string> = {
      docsFontStyle: 'fontStyle',
      docsSmallText: 'smallText',
      docsFullWidth: 'fullWidth',
      docsSpellCheck: 'spellCheck',
      docsOpenLastVisited: 'openLastVisited',
      docsSidebarDefault: 'sidebarDefault',
    };
    const patch: Record<string, unknown> = {};
    for (const [serverKey, localKey] of Object.entries(map)) {
      if (serverKey in data && data[serverKey] !== undefined && data[serverKey] !== null) {
        patch[localKey] = data[serverKey];
      }
    }
    set({ ...patch, _hydrated: true } as Partial<DocSettingsState>);
  },
}));

export function useDocSettingsSync() {
  const hydrateFromServer = useDocSettingsStore((s) => s._hydrateFromServer);
  const hydrated = useDocSettingsStore((s) => s._hydrated);

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
