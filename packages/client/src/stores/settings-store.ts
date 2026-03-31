import { create } from 'zustand';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import i18n from '../i18n';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { ThemeMode, Density, ColorThemeId } from '@atlasmail/shared';

export type FontFamilyId = 'inter' | 'geist' | 'system' | 'roboto' | 'open-sans' | 'lato';

interface SettingsState {
  theme: ThemeMode;
  density: Density;
  language: string;
  fontFamily: FontFamilyId;
  customShortcuts: Record<string, string>;
  sendAnimation: boolean;
  themeTransition: boolean;
  colorTheme: ColorThemeId;
  // Format settings
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timezone: string;
  currencySymbol: string;
  timeFormat: '12h' | '24h';
  numberFormat: 'comma-period' | 'period-comma' | 'space-comma';
  calendarStartDay: 'sunday' | 'monday';
  setDateFormat: (value: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD') => void;
  setTimezone: (value: string) => void;
  setCurrencySymbol: (value: string) => void;
  setTimeFormat: (value: '12h' | '24h') => void;
  setNumberFormat: (value: 'comma-period' | 'period-comma' | 'space-comma') => void;
  setCalendarStartDay: (value: 'sunday' | 'monday') => void;
  _hydrated: boolean;
  setTheme: (theme: ThemeMode) => void;
  setColorTheme: (colorTheme: ColorThemeId) => void;
  setDensity: (density: Density) => void;
  setFontFamily: (fontFamily: FontFamilyId) => void;
  setCustomShortcut: (id: string, keys: string) => void;
  setSendAnimation: (value: boolean) => void;
  setThemeTransition: (value: boolean) => void;
  setLanguage: (language: string) => void;
  _hydrateFromServer: (data: Record<string, unknown>) => void;
}

// Map from local field names to server column names
const TO_SERVER: Record<string, string> = {
  theme: 'theme',
  density: 'density',
  language: 'language',
  fontFamily: 'fontFamily',
  customShortcuts: 'customShortcuts',
  sendAnimation: 'sendAnimation',
  themeTransition: 'themeTransition',
  colorTheme: 'colorTheme',
  dateFormat: 'dateFormat',
  timezone: 'timezone',
  currencySymbol: 'currencySymbol',
  timeFormat: 'timeFormat',
  numberFormat: 'numberFormat',
  calendarStartDay: 'calendarStartDay',
};

const FROM_SERVER: Record<string, string> = Object.fromEntries(
  Object.entries(TO_SERVER).map(([local, server]) => [server, local])
);

// Persist to server (fire-and-forget)
function persistToServer(serverKey: string, value: unknown) {
  api.put('/settings', { [serverKey]: value }).catch(() => {});
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  theme: 'dark',
  density: 'default',
  fontFamily: 'inter',
  language: i18n.language?.split('-')[0] || 'en',
  customShortcuts: {},
  sendAnimation: true,
  themeTransition: true,
  colorTheme: 'default',
  // Format defaults
  dateFormat: 'DD/MM/YYYY',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  currencySymbol: '$',
  timeFormat: '12h',
  numberFormat: 'comma-period',
  calendarStartDay: 'monday',
  _hydrated: false,
  setTheme: (theme) => { set({ theme }); persistToServer('theme', theme); },
  setColorTheme: (colorTheme) => { set({ colorTheme }); persistToServer('colorTheme', colorTheme); },
  setDensity: (density) => { set({ density }); persistToServer('density', density); },
  setFontFamily: (fontFamily) => { set({ fontFamily }); persistToServer('fontFamily', fontFamily); },
  setCustomShortcut: (id, keys) =>
    set((s) => {
      const customShortcuts = { ...s.customShortcuts, [id]: keys };
      persistToServer('customShortcuts', customShortcuts);
      return { customShortcuts };
    }),
  setSendAnimation: (sendAnimation) => { set({ sendAnimation }); persistToServer('sendAnimation', sendAnimation); },
  setThemeTransition: (themeTransition) => { set({ themeTransition }); persistToServer('themeTransition', themeTransition); },
  setLanguage: (language) => {
    i18n.changeLanguage(language);
    set({ language });
    persistToServer('language', language);
  },
  // Format setters
  setDateFormat: (dateFormat) => { set({ dateFormat }); persistToServer('dateFormat', dateFormat); },
  setTimezone: (timezone) => { set({ timezone }); persistToServer('timezone', timezone); },
  setCurrencySymbol: (currencySymbol) => { set({ currencySymbol }); persistToServer('currencySymbol', currencySymbol); },
  setTimeFormat: (timeFormat) => { set({ timeFormat }); persistToServer('timeFormat', timeFormat); },
  setNumberFormat: (numberFormat) => { set({ numberFormat }); persistToServer('numberFormat', numberFormat); },
  setCalendarStartDay: (calendarStartDay) => { set({ calendarStartDay }); persistToServer('calendarStartDay', calendarStartDay); },
  _hydrateFromServer: (data: Record<string, unknown>) => {
    const patch: Record<string, unknown> = {};
    for (const [serverKey, localKey] of Object.entries(FROM_SERVER)) {
      if (serverKey in data && data[serverKey] !== undefined && data[serverKey] !== null) {
        patch[localKey] = data[serverKey];
      }
    }
    if (data.language && typeof data.language === 'string') {
      i18n.changeLanguage(data.language);
    }
    set({ ...patch, _hydrated: true } as Partial<SettingsState>);
  },
}));

/**
 * Hook to sync settings store from server on mount.
 * Call this once near the app root (e.g. in App.tsx or a layout provider).
 */
export function useSettingsSync() {
  const hydrateFromServer = useSettingsStore((s) => s._hydrateFromServer);
  const hydrated = useSettingsStore((s) => s._hydrated);

  const hasToken = !!localStorage.getItem('atlasmail_token');

  const { data: serverSettings } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as Record<string, unknown> | null;
    },
    staleTime: 60_000,
    enabled: hasToken,
  });

  useEffect(() => {
    if (serverSettings && !hydrated) {
      hydrateFromServer(serverSettings);
      // Auto-detect timezone on first use (server stores empty string by default)
      if (!serverSettings.timezone) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) {
          api.put('/settings', { timezone: tz }).catch(() => {});
        }
      }
    }
  }, [serverSettings, hydrated, hydrateFromServer]);
}
