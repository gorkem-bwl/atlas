import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  shortcutHelpOpen: boolean;
  searchFocused: boolean;
  settingsOpen: boolean;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleShortcutHelp: () => void;
  setSearchFocused: (focused: boolean) => void;
  toggleSettings: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  shortcutHelpOpen: false,
  searchFocused: false,
  settingsOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleShortcutHelp: () => set((s) => ({ shortcutHelpOpen: !s.shortcutHelpOpen })),
  setSearchFocused: (focused) => set({ searchFocused: focused }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}));
