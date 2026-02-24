export type ThemeMode = 'light' | 'dark' | 'system';
export type Density = 'compact' | 'default' | 'comfortable';
export type ReadingPanePosition = 'right' | 'bottom' | 'hidden';
export type AutoAdvance = 'next' | 'previous' | 'list';

export interface UserSettings {
  id: string;
  accountId: string;
  theme: ThemeMode;
  density: Density;
  shortcutsPreset: 'superhuman' | 'gmail' | 'custom';
  customShortcuts: Record<string, string>;
  autoAdvance: AutoAdvance;
  readingPane: ReadingPanePosition;
  desktopNotifications: boolean;
  notificationSound: boolean;
  signatureHtml: string | null;
}
