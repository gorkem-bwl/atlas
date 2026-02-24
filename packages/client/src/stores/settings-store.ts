import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, Density } from '@atlasmail/shared';

interface SettingsState {
  theme: ThemeMode;
  density: Density;
  customShortcuts: Record<string, string>;
  readingPane: 'right' | 'bottom' | 'hidden';
  autoAdvance: 'next' | 'previous' | 'list';
  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: Density) => void;
  setCustomShortcut: (id: string, keys: string) => void;
  setReadingPane: (pane: 'right' | 'bottom' | 'hidden') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      density: 'default',
      customShortcuts: {},
      readingPane: 'right',
      autoAdvance: 'next',
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setCustomShortcut: (id, keys) =>
        set((s) => ({ customShortcuts: { ...s.customShortcuts, [id]: keys } })),
      setReadingPane: (readingPane) => set({ readingPane }),
    }),
    { name: 'atlasmail-settings' },
  ),
);
