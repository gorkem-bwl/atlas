import { useSettingsStore } from '../stores/settings-store';

export function useTheme() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  return { theme, setTheme };
}
