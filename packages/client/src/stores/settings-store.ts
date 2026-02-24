import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, Density } from '@atlasmail/shared';

interface SettingsState {
  theme: ThemeMode;
  density: Density;
  customShortcuts: Record<string, string>;
  readingPane: 'right' | 'bottom' | 'hidden';
  autoAdvance: 'next' | 'previous' | 'list';
  desktopNotifications: boolean;
  soundNotifications: boolean;
  showBadgeCount: boolean;
  notificationLevel: 'all' | 'smart' | 'priority' | 'none';
  composeMode: 'plain' | 'rich';
  signature: string;
  undoSendDelay: 5 | 10 | 30;
  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: Density) => void;
  setCustomShortcut: (id: string, keys: string) => void;
  setReadingPane: (pane: 'right' | 'bottom' | 'hidden') => void;
  setAutoAdvance: (advance: 'next' | 'previous' | 'list') => void;
  setDesktopNotifications: (value: boolean) => void;
  setSoundNotifications: (value: boolean) => void;
  setShowBadgeCount: (value: boolean) => void;
  setNotificationLevel: (level: 'all' | 'smart' | 'priority' | 'none') => void;
  setComposeMode: (mode: 'plain' | 'rich') => void;
  setSignature: (signature: string) => void;
  setUndoSendDelay: (delay: 5 | 10 | 30) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      density: 'default',
      customShortcuts: {},
      readingPane: 'right',
      autoAdvance: 'next',
      desktopNotifications: true,
      soundNotifications: false,
      showBadgeCount: true,
      notificationLevel: 'smart',
      composeMode: 'rich',
      signature: '',
      undoSendDelay: 10,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setCustomShortcut: (id, keys) =>
        set((s) => ({ customShortcuts: { ...s.customShortcuts, [id]: keys } })),
      setReadingPane: (readingPane) => set({ readingPane }),
      setAutoAdvance: (autoAdvance) => set({ autoAdvance }),
      setDesktopNotifications: (desktopNotifications) => set({ desktopNotifications }),
      setSoundNotifications: (soundNotifications) => set({ soundNotifications }),
      setShowBadgeCount: (showBadgeCount) => set({ showBadgeCount }),
      setNotificationLevel: (notificationLevel) => set({ notificationLevel }),
      setComposeMode: (composeMode) => set({ composeMode }),
      setSignature: (signature) => set({ signature }),
      setUndoSendDelay: (undoSendDelay) => set({ undoSendDelay }),
    }),
    { name: 'atlasmail-settings' },
  ),
);
