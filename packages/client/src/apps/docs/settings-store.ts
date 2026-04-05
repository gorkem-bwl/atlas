import { createAppSettingsStore } from '../../lib/create-app-settings-store';

export type DocFontStyle = 'default' | 'serif' | 'mono';
export type DocSidebarDefault = 'tree' | 'favorites' | 'recent';

interface DocSettings {
  fontStyle: DocFontStyle;
  smallText: boolean;
  fullWidth: boolean;
  spellCheck: boolean;
  openLastVisited: boolean;
  sidebarDefault: DocSidebarDefault;
}

const { useStore: useDocSettingsStore, useSync: useDocSettingsSync } = createAppSettingsStore<DocSettings>({
  defaults: {
    fontStyle: 'default',
    smallText: false,
    fullWidth: false,
    spellCheck: true,
    openLastVisited: true,
    sidebarDefault: 'tree',
  },
  fieldMapping: {
    fontStyle: 'docsFontStyle',
    smallText: 'docsSmallText',
    fullWidth: 'docsFullWidth',
    spellCheck: 'docsSpellCheck',
    openLastVisited: 'docsOpenLastVisited',
    sidebarDefault: 'docsSidebarDefault',
  },
});

export { useDocSettingsStore, useDocSettingsSync };
