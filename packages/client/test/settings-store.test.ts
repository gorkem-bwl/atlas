import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from '../src/stores/settings-store';
import { api } from '../src/lib/api-client';

// Mock i18n module directly (settings-store imports from '../i18n', not react-i18next)
vi.mock('../src/i18n', () => ({
  default: {
    language: 'en',
    changeLanguage: vi.fn(),
  },
}));

// Import the mocked i18n so we can assert on it
import i18n from '../src/i18n';

describe('settings-store', () => {
  beforeEach(() => {
    // Reset store to defaults between tests
    useSettingsStore.setState({
      theme: 'dark',
      density: 'default',
      fontFamily: 'inter',
      language: 'en',
      customShortcuts: {},
      sendAnimation: true,
      themeTransition: true,
      colorTheme: 'default',
      dateFormat: 'DD/MM/YYYY',
      currencySymbol: '$',
      timeFormat: '12h',
      numberFormat: 'comma-period',
      calendarStartDay: 'monday',
      _hydrated: false,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has dark theme by default', () => {
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('has default density', () => {
      expect(useSettingsStore.getState().density).toBe('default');
    });

    it('has inter font family by default', () => {
      expect(useSettingsStore.getState().fontFamily).toBe('inter');
    });

    it('has send animation enabled by default', () => {
      expect(useSettingsStore.getState().sendAnimation).toBe(true);
    });

    it('is not hydrated initially', () => {
      expect(useSettingsStore.getState()._hydrated).toBe(false);
    });

    it('has DD/MM/YYYY date format by default', () => {
      expect(useSettingsStore.getState().dateFormat).toBe('DD/MM/YYYY');
    });
  });

  describe('setTheme', () => {
    it('updates theme in state', () => {
      useSettingsStore.getState().setTheme('light');
      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('persists theme to server via API', () => {
      useSettingsStore.getState().setTheme('system');
      expect(api.put).toHaveBeenCalledWith('/settings', { theme: 'system' });
    });
  });

  describe('setLanguage', () => {
    it('updates language in state', () => {
      useSettingsStore.getState().setLanguage('de');
      expect(useSettingsStore.getState().language).toBe('de');
    });

    it('calls i18n.changeLanguage', () => {
      useSettingsStore.getState().setLanguage('fr');
      expect(i18n.changeLanguage).toHaveBeenCalledWith('fr');
    });

    it('persists language to server', () => {
      useSettingsStore.getState().setLanguage('tr');
      expect(api.put).toHaveBeenCalledWith('/settings', { language: 'tr' });
    });
  });

  describe('_hydrateFromServer', () => {
    it('patches state from server data', () => {
      useSettingsStore.getState()._hydrateFromServer({
        theme: 'light',
        density: 'compact',
        fontFamily: 'geist',
      });
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('light');
      expect(state.density).toBe('compact');
      expect(state.fontFamily).toBe('geist');
    });

    it('sets _hydrated to true', () => {
      useSettingsStore.getState()._hydrateFromServer({});
      expect(useSettingsStore.getState()._hydrated).toBe(true);
    });

    it('ignores null and undefined server values', () => {
      useSettingsStore.getState()._hydrateFromServer({
        theme: null,
        density: undefined,
      });
      expect(useSettingsStore.getState().theme).toBe('dark');
      expect(useSettingsStore.getState().density).toBe('default');
    });

    it('calls i18n.changeLanguage when language is present', () => {
      useSettingsStore.getState()._hydrateFromServer({ language: 'it' });
      expect(i18n.changeLanguage).toHaveBeenCalledWith('it');
    });
  });

  describe('format setters persist to server', () => {
    it('setDateFormat persists', () => {
      useSettingsStore.getState().setDateFormat('YYYY-MM-DD');
      expect(useSettingsStore.getState().dateFormat).toBe('YYYY-MM-DD');
      expect(api.put).toHaveBeenCalledWith('/settings', { dateFormat: 'YYYY-MM-DD' });
    });

    it('setCurrencySymbol persists', () => {
      useSettingsStore.getState().setCurrencySymbol('€');
      expect(useSettingsStore.getState().currencySymbol).toBe('€');
      expect(api.put).toHaveBeenCalledWith('/settings', { currencySymbol: '€' });
    });

    it('setTimeFormat persists', () => {
      useSettingsStore.getState().setTimeFormat('24h');
      expect(useSettingsStore.getState().timeFormat).toBe('24h');
      expect(api.put).toHaveBeenCalledWith('/settings', { timeFormat: '24h' });
    });

    it('setNumberFormat persists', () => {
      useSettingsStore.getState().setNumberFormat('period-comma');
      expect(useSettingsStore.getState().numberFormat).toBe('period-comma');
      expect(api.put).toHaveBeenCalledWith('/settings', { numberFormat: 'period-comma' });
    });

    it('setCalendarStartDay persists', () => {
      useSettingsStore.getState().setCalendarStartDay('sunday');
      expect(useSettingsStore.getState().calendarStartDay).toBe('sunday');
      expect(api.put).toHaveBeenCalledWith('/settings', { calendarStartDay: 'sunday' });
    });
  });
});
