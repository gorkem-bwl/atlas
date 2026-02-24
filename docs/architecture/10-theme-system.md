# Part 10: Theme System

AtlasMail supports light, dark, and system-preference themes using CSS custom
properties (design tokens) integrated with Radix UI's theming primitives.

---

## 10.1 Architecture

```
  User selects theme
        │
        ▼
  Zustand settings store
  (persisted to localStorage)
        │
        ▼
  ThemeProvider
  (sets data-theme attribute on <html>)
        │
        ▼
  CSS custom properties activate
  (via [data-theme="dark"] selector)
        │
        ▼
  Radix UI components inherit tokens
  Custom components inherit tokens
```

---

## 10.2 Design Tokens

```css
/* packages/client/src/styles/theme.css */

/* ── BASE TOKENS (light theme) ──────────────────────────────── */
:root,
[data-theme="light"] {
  /* Background layers */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  --color-bg-elevated: #ffffff;
  --color-bg-overlay: rgba(0, 0, 0, 0.5);

  /* Surface colors (for cards, panels) */
  --color-surface-primary: #ffffff;
  --color-surface-hover: #f9fafb;
  --color-surface-active: #f3f4f6;
  --color-surface-selected: #eff6ff;

  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;
  --color-text-inverse: #ffffff;
  --color-text-link: #2563eb;

  /* Borders */
  --color-border-primary: #e5e7eb;
  --color-border-secondary: #f3f4f6;
  --color-border-focus: #2563eb;

  /* Brand / accent */
  --color-accent-primary: #2563eb;
  --color-accent-primary-hover: #1d4ed8;
  --color-accent-primary-active: #1e40af;

  /* Status colors */
  --color-success: #059669;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-info: #2563eb;

  /* Email-specific */
  --color-unread-indicator: #2563eb;
  --color-star: #eab308;
  --color-category-important: #2563eb;
  --color-category-other: #6b7280;
  --color-category-newsletters: #7c3aed;
  --color-category-notifications: #ea580c;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --shadow-elevated: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 100ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;

  /* Layout */
  --sidebar-width: 220px;
  --email-list-width: 400px;
  --header-height: 48px;
}

/* ── DARK THEME ─────────────────────────────────────────────── */
[data-theme="dark"] {
  --color-bg-primary: #0f0f0f;
  --color-bg-secondary: #171717;
  --color-bg-tertiary: #1f1f1f;
  --color-bg-elevated: #262626;
  --color-bg-overlay: rgba(0, 0, 0, 0.7);

  --color-surface-primary: #171717;
  --color-surface-hover: #1f1f1f;
  --color-surface-active: #262626;
  --color-surface-selected: #172554;

  --color-text-primary: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-text-tertiary: #6b7280;
  --color-text-inverse: #111827;
  --color-text-link: #60a5fa;

  --color-border-primary: #2e2e2e;
  --color-border-secondary: #1f1f1f;
  --color-border-focus: #3b82f6;

  --color-accent-primary: #3b82f6;
  --color-accent-primary-hover: #60a5fa;
  --color-accent-primary-active: #2563eb;

  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  --color-unread-indicator: #3b82f6;
  --color-star: #facc15;
  --color-category-important: #3b82f6;
  --color-category-other: #9ca3af;
  --color-category-newsletters: #a78bfa;
  --color-category-notifications: #fb923c;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
}

/* ── DENSITY VARIANTS ───────────────────────────────────────── */
[data-density="compact"] {
  --email-list-item-height: 52px;
  --email-list-padding: 6px 12px;
  --font-size-md: 13px;
}

[data-density="default"] {
  --email-list-item-height: 64px;
  --email-list-padding: 10px 16px;
}

[data-density="comfortable"] {
  --email-list-item-height: 80px;
  --email-list-padding: 14px 20px;
}
```

---

## 10.3 Theme Provider

```typescript
// packages/client/src/providers/theme-provider.tsx

import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore(s => s.theme);
  const density = useSettingsStore(s => s.density);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      // Detect system preference
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
```

---

## 10.4 Radix UI Integration

Radix UI primitives are unstyled by default. We style them using our CSS
custom properties:

```css
/* packages/client/src/styles/global.css */

/* Radix Dialog (used for compose modal, settings) */
.dialog-overlay {
  background-color: var(--color-bg-overlay);
  position: fixed;
  inset: 0;
  animation: overlayShow var(--transition-normal);
}

.dialog-content {
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-elevated);
  border: 1px solid var(--color-border-primary);
  color: var(--color-text-primary);
}

/* Radix DropdownMenu */
.dropdown-content {
  background-color: var(--color-bg-elevated);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xs);
  min-width: 180px;
}

.dropdown-item {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.dropdown-item:hover,
.dropdown-item[data-highlighted] {
  background-color: var(--color-surface-hover);
}

/* Radix Tooltip */
.tooltip-content {
  background-color: var(--color-text-primary);
  color: var(--color-text-inverse);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

/* Radix ScrollArea */
.scroll-area-scrollbar {
  width: 6px;
  padding: 2px;
}

.scroll-area-thumb {
  background-color: var(--color-text-tertiary);
  border-radius: var(--radius-full);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.scroll-area-root:hover .scroll-area-thumb {
  opacity: 1;
}
```

---

## 10.5 Electron Theme Sync

In Electron, the theme also affects the native title bar and window chrome:

```typescript
// packages/desktop/src/main.ts

import { nativeTheme, ipcMain } from 'electron';

ipcMain.on('theme:changed', (_, theme: 'light' | 'dark' | 'system') => {
  switch (theme) {
    case 'dark':
      nativeTheme.themeSource = 'dark';
      break;
    case 'light':
      nativeTheme.themeSource = 'light';
      break;
    case 'system':
      nativeTheme.themeSource = 'system';
      break;
  }
});
```

---

## 10.6 Theme-Aware Email Body Rendering

Email HTML bodies can contain inline styles with white backgrounds that look
wrong in dark mode. We handle this with a sandboxed iframe approach:

```typescript
// packages/client/src/components/email/email-body.tsx

export function EmailBody({ html }: { html: string }) {
  const theme = useSettingsStore(s => s.theme);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    // Inject dark mode CSS if needed
    const darkModeCSS = theme === 'dark' ? `
      <style>
        html { color-scheme: dark; }
        body {
          color: #f9fafb !important;
          background: transparent !important;
        }
        img { opacity: 0.9; }
        /* Invert colors but preserve images */
        * {
          border-color: #2e2e2e !important;
        }
      </style>
    ` : '';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: var(--font-family, sans-serif);
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
            padding: 16px;
            word-break: break-word;
          }
          img { max-width: 100%; height: auto; }
          a { color: var(--color-text-link, #2563eb); }
          pre { overflow-x: auto; }
          blockquote {
            border-left: 3px solid var(--color-border-primary, #e5e7eb);
            margin: 8px 0;
            padding-left: 12px;
            color: var(--color-text-secondary, #6b7280);
          }
        </style>
        ${darkModeCSS}
      </head>
      <body>${sanitizeHtml(html)}</body>
      </html>
    `);
    doc.close();
  }, [html, theme]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      title="Email content"
      style={{
        width: '100%',
        border: 'none',
        background: 'transparent',
      }}
    />
  );
}
```

The `sanitizeHtml` function uses DOMPurify to strip scripts, event handlers,
and other dangerous content while preserving layout-relevant styles and
structure.
