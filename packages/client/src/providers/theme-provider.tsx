import { useEffect, type ReactNode } from 'react';
import { useSettingsStore } from '../stores/settings-store';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const density = useSettingsStore((s) => s.density);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystem = (e: MediaQueryListEvent | MediaQueryList) => {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      applySystem(mediaQuery);
      mediaQuery.addEventListener('change', applySystem);
      return () => mediaQuery.removeEventListener('change', applySystem);
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  return <>{children}</>;
}
