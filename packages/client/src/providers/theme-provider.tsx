import { useEffect, useRef, type ReactNode } from 'react';
import { useSettingsStore, useSettingsSync } from '../stores/settings-store';
import type { FontFamilyId } from '../stores/settings-store';
import { applyColorTheme } from '../lib/color-themes';

const FONT_FAMILY_CSS: Record<FontFamilyId, string> = {
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  geist: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  roboto: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'open-sans': "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  lato: "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

/**
 * Smoothly transition the theme by sweeping from top to bottom.
 * Uses the View Transitions API when available, otherwise falls back to a
 * canvas-snapshot overlay that fades out with a vertical gradient mask.
 */
function applyThemeWithTransition(root: HTMLElement, newValue: string) {
  const oldValue = root.getAttribute('data-theme');
  if (oldValue === newValue) {
    root.setAttribute('data-theme', newValue);
    return;
  }

  // ── View Transitions API (Chrome 111+) ────────────────────────────────
  const doc = document;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supportsViewTransition = typeof (doc as any).startViewTransition === 'function';

  if (supportsViewTransition) {
    // Suppress pointer events during transition so Radix Dialog doesn't
    // interpret clicks on the view-transition snapshot as "outside" clicks.
    const suppress = (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };
    doc.addEventListener('pointerdown', suppress, { capture: true });

    const transition = (doc as unknown as { startViewTransition: (cb: () => void) => { finished: Promise<void> } }).startViewTransition(
      () => {
        root.setAttribute('data-theme', newValue);
      },
    );
    const cleanup = () => doc.removeEventListener('pointerdown', suppress, { capture: true });
    transition.finished.then(cleanup, cleanup);
    // Safety timeout in case the transition promise never settles
    setTimeout(cleanup, 2000);
    return;
  }

  // ── Fallback: canvas snapshot + CSS mask sweep ─────────────────────────
  try {
    // Take a snapshot of the current screen via a plain overlay
    const overlay = doc.createElement('div');
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      pointerEvents: 'none',
      background: getComputedStyle(root).getPropertyValue('--color-bg-primary').trim() || '#ffffff',
      // Animate: clip from full-height down to zero using a top-to-bottom reveal
      clipPath: 'inset(0 0 0 0)',
      transition: 'clip-path 500ms cubic-bezier(0.4, 0, 0.2, 1)',
    });
    doc.body.appendChild(overlay);

    // Apply the new theme immediately (it's hidden behind the overlay)
    root.setAttribute('data-theme', newValue);

    // Trigger the sweep animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.clipPath = 'inset(0 0 100% 0)';
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        // Safety cleanup
        setTimeout(() => overlay.remove(), 600);
      });
    });
  } catch {
    // If anything goes wrong, just apply the theme
    root.setAttribute('data-theme', newValue);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useSettingsSync();
  const theme = useSettingsStore((s) => s.theme);
  const density = useSettingsStore((s) => s.density);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const colorTheme = useSettingsStore((s) => s.colorTheme);
  const themeTransition = useSettingsStore((s) => s.themeTransition);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (value: string) => {
      if (isFirstRender.current || !themeTransition) {
        root.setAttribute('data-theme', value);
        isFirstRender.current = false;
      } else {
        applyThemeWithTransition(root, value);
      }
      // Apply accent color variables for the resolved mode
      applyColorTheme(colorTheme, value as 'light' | 'dark');
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystem = (e: MediaQueryListEvent | MediaQueryList) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      applySystem(mediaQuery);
      mediaQuery.addEventListener('change', applySystem);
      return () => mediaQuery.removeEventListener('change', applySystem);
    } else {
      applyTheme(theme);
    }
  }, [theme, themeTransition, colorTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--font-family',
      FONT_FAMILY_CSS[fontFamily] || FONT_FAMILY_CSS.inter,
    );
  }, [fontFamily]);

  return <>{children}</>;
}
