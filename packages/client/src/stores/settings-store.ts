import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';
import type { ThemeMode, Density, ColorThemeId } from '@atlasmail/shared';

export type FontFamilyId = 'inter' | 'geist' | 'system' | 'roboto' | 'open-sans' | 'lato';

export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'
  | 'groq'
  | 'mistral'
  | 'deepseek'
  | 'xai'
  | 'perplexity'
  | 'fireworks'
  | 'together'
  | 'cohere'
  | 'custom';

interface CustomAIProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
}

interface SettingsState {
  theme: ThemeMode;
  density: Density;
  language: string;
  fontFamily: FontFamilyId;
  customShortcuts: Record<string, string>;
  readingPane: 'right' | 'bottom' | 'hidden';
  autoAdvance: 'next' | 'previous' | 'list';
  desktopNotifications: boolean;
  soundNotifications: boolean;
  showBadgeCount: boolean;
  notificationLevel: 'all' | 'smart' | 'priority' | 'none';
  composeMode: 'plain' | 'rich';
  signature: string;
  signatureHtml: string;
  includeSignatureInReplies: boolean;
  undoSendDelay: 5 | 10 | 20 | 30;
  sendAnimation: boolean;
  themeTransition: boolean;
  colorTheme: ColorThemeId;
  trackingEnabled: boolean;
  // AI settings
  aiEnabled: boolean;
  aiProvider: AIProvider;
  aiApiKeys: Partial<Record<AIProvider, string>>;
  aiCustomProvider: CustomAIProvider;
  aiWritingAssistant: boolean;
  aiQuickReplies: boolean;
  aiThreadSummary: boolean;
  aiTranslation: boolean;
  setTheme: (theme: ThemeMode) => void;
  setColorTheme: (colorTheme: ColorThemeId) => void;
  setDensity: (density: Density) => void;
  setFontFamily: (fontFamily: FontFamilyId) => void;
  setCustomShortcut: (id: string, keys: string) => void;
  setReadingPane: (pane: 'right' | 'bottom' | 'hidden') => void;
  setAutoAdvance: (advance: 'next' | 'previous' | 'list') => void;
  setDesktopNotifications: (value: boolean) => void;
  setSoundNotifications: (value: boolean) => void;
  setShowBadgeCount: (value: boolean) => void;
  setNotificationLevel: (level: 'all' | 'smart' | 'priority' | 'none') => void;
  setComposeMode: (mode: 'plain' | 'rich') => void;
  setSignature: (signature: string) => void;
  setSignatureHtml: (signatureHtml: string) => void;
  setIncludeSignatureInReplies: (value: boolean) => void;
  setUndoSendDelay: (delay: 5 | 10 | 20 | 30) => void;
  setSendAnimation: (value: boolean) => void;
  setThemeTransition: (value: boolean) => void;
  setTrackingEnabled: (value: boolean) => void;
  setLanguage: (language: string) => void;
  // AI setters
  setAIEnabled: (value: boolean) => void;
  setAIProvider: (provider: AIProvider) => void;
  setAIApiKey: (provider: AIProvider, key: string) => void;
  setAICustomProvider: (custom: Partial<CustomAIProvider>) => void;
  setAIWritingAssistant: (value: boolean) => void;
  setAIQuickReplies: (value: boolean) => void;
  setAIThreadSummary: (value: boolean) => void;
  setAITranslation: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      density: 'default',
      fontFamily: 'inter',
      language: i18n.language?.split('-')[0] || 'en',
      customShortcuts: {},
      readingPane: 'right',
      autoAdvance: 'next',
      desktopNotifications: true,
      soundNotifications: false,
      showBadgeCount: true,
      notificationLevel: 'smart',
      composeMode: 'rich',
      signature: '',
      signatureHtml: '',
      includeSignatureInReplies: true,
      undoSendDelay: 5,
      sendAnimation: true,
      themeTransition: true,
      colorTheme: 'default',
      trackingEnabled: false,
      // AI defaults
      aiEnabled: false,
      aiProvider: 'openai',
      aiApiKeys: {},
      aiCustomProvider: { name: '', baseUrl: '', apiKey: '' },
      aiWritingAssistant: true,
      aiQuickReplies: true,
      aiThreadSummary: true,
      aiTranslation: true,
      setTheme: (theme) => set({ theme }),
      setColorTheme: (colorTheme) => set({ colorTheme }),
      setDensity: (density) => set({ density }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
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
      setSignatureHtml: (signatureHtml) => set({ signatureHtml }),
      setIncludeSignatureInReplies: (includeSignatureInReplies) =>
        set({ includeSignatureInReplies }),
      setUndoSendDelay: (undoSendDelay) => set({ undoSendDelay }),
      setSendAnimation: (sendAnimation) => set({ sendAnimation }),
      setThemeTransition: (themeTransition) => set({ themeTransition }),
      setTrackingEnabled: (trackingEnabled) => set({ trackingEnabled }),
      setLanguage: (language) => {
        i18n.changeLanguage(language);
        localStorage.setItem('atlasmail-language', language);
        set({ language });
      },
      // AI setters
      setAIEnabled: (aiEnabled) => set({ aiEnabled }),
      setAIProvider: (aiProvider) => set({ aiProvider }),
      setAIApiKey: (provider, key) =>
        set((s) => ({ aiApiKeys: { ...s.aiApiKeys, [provider]: key } })),
      setAICustomProvider: (partial) =>
        set((s) => ({ aiCustomProvider: { ...s.aiCustomProvider, ...partial } })),
      setAIWritingAssistant: (aiWritingAssistant) => set({ aiWritingAssistant }),
      setAIQuickReplies: (aiQuickReplies) => set({ aiQuickReplies }),
      setAIThreadSummary: (aiThreadSummary) => set({ aiThreadSummary }),
      setAITranslation: (aiTranslation) => set({ aiTranslation }),
    }),
    { name: 'atlasmail-settings' },
  ),
);
