# Global Top Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 48px fixed top bar to every authenticated app page (except Home and Draw). Contains breadcrumb (left), ⌘K search trigger + notification bell + help + avatar (right). ContentArea drops its title row. Rail footer's avatar moves to the top bar. One atomic commit.

**Architecture:** Top bar is a fixed overlay at `top: 0; left: 56; right: 0` (right of the rail). Breadcrumb reads from a new `BreadcrumbContext` with automatic derivation from route + app registry, overridable per-page via `useBreadcrumb(...)`. Help button reuses the existing `shortcutHelpOpen` flag, with the `KeyboardShortcutsHelp` component promoted from Docs-only to a shared global component. Account menu extracted from `AccountSwitcherRail` into a shared `AccountMenu`. Notification bell removed from `AppSidebar` header; now mounted only in the top bar.

**Tech Stack:** React 19, React Router v6 (existing `useParams`, `useLocation`, `Link`), Zustand (`useUIStore`), react-i18next, Radix Popover (via existing Atlas `Popover` wrapper).

---

## File Structure

### Files created (4)
- `packages/client/src/components/layout/top-bar.tsx` — the bar.
- `packages/client/src/components/layout/account-menu.tsx` — extracted avatar + popover.
- `packages/client/src/lib/breadcrumb-context.tsx` — context + `useBreadcrumb` / `useBreadcrumbValue` hooks.
- `packages/client/src/components/shared/keyboard-shortcuts-help.tsx` — moved from Docs.

### Files modified (15+)
- `packages/client/src/App.tsx` — add `<BreadcrumbProvider>`, `<TopBarWrapper />`, global `<KeyboardShortcutsHelp />` mount.
- `packages/client/src/components/layout/app-rail.tsx` — remove `<AccountSwitcherRail />` render.
- `packages/client/src/components/layout/app-sidebar.tsx` — remove `<NotificationBell />` import + render.
- `packages/client/src/components/ui/content-area.tsx` — drop title-only render path; keep `breadcrumbs` and `headerSlot`; add optional `subtitle` prop.
- 11 app/page outer shells — add `marginTop: 48; height: calc(100vh - 48px)` (except Draw). Same 12 files Phase B1 touched (minus Draw).
- `packages/client/src/apps/docs/components/doc-editor.tsx` — remove local `<KeyboardShortcutsHelp />` import + render (now global).

### Files deleted (2)
- `packages/client/src/components/layout/account-switcher-rail.tsx` — superseded by `account-menu.tsx`.
- `packages/client/src/apps/docs/components/editor/keyboard-shortcuts-help.tsx` — moved.

### Not touched
- `command-palette.tsx` — unchanged, still CRM-only.
- `notification-bell.tsx` — unchanged.
- App manifests.
- Theme tokens.

---

## Task 1: Verify clean tree

- [ ] **Step 1: Confirm starting state**

```bash
cd /Users/gorkemcetin/atlasmail
git status
git log -1 --oneline
```

Expected: `nothing to commit, working tree clean`. HEAD should be `4b1dcf5 docs(ui-refresh): spec for global top bar` or later.

If not clean, stop.

---

## Task 2: Breadcrumb context

**Files:**
- Create: `packages/client/src/lib/breadcrumb-context.tsx`

- [ ] **Step 1: Write the file**

Create `packages/client/src/lib/breadcrumb-context.tsx` with exactly:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbContextValue {
  crumbs: BreadcrumbItem[] | null;
  setCrumbs: (c: BreadcrumbItem[] | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  crumbs: null,
  setCrumbs: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[] | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ crumbs, setCrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb(crumbs: BreadcrumbItem[] | null) {
  const { setCrumbs } = useContext(BreadcrumbContext);
  const key = crumbs ? JSON.stringify(crumbs) : 'null';
  useEffect(() => {
    setCrumbs(crumbs);
    return () => setCrumbs(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function useBreadcrumbValue(): BreadcrumbItem[] | null {
  return useContext(BreadcrumbContext).crumbs;
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 3: No commit yet**

All Task 2–11 work combines into one commit at Task 12.

---

## Task 3: Account menu (extract shared avatar + popover)

**Files:**
- Create: `packages/client/src/components/layout/account-menu.tsx`
- Delete (in Task 10): `packages/client/src/components/layout/account-switcher-rail.tsx`

- [ ] **Step 1: Write the new file**

Create `packages/client/src/components/layout/account-menu.tsx` by taking the existing `account-switcher-rail.tsx` file content and exporting it under the new name `AccountMenu`. Keep all logic identical — popover positioning, avatar, dropdown, sign-out confirm. Only change: export name.

Open `/Users/gorkemcetin/atlasmail/packages/client/src/components/layout/account-switcher-rail.tsx`, copy its full content, and write to `packages/client/src/components/layout/account-menu.tsx` with ONE change: rename `export function AccountSwitcherRail()` to `export function AccountMenu()`.

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`. (Both files coexist temporarily — rail still imports the old one.)

- [ ] **Step 3: No commit yet**

---

## Task 4: Move KeyboardShortcutsHelp to shared location

**Files:**
- Create: `packages/client/src/components/shared/keyboard-shortcuts-help.tsx`
- Delete (in Task 10): `packages/client/src/apps/docs/components/editor/keyboard-shortcuts-help.tsx`

- [ ] **Step 1: Copy the file**

Read `/Users/gorkemcetin/atlasmail/packages/client/src/apps/docs/components/editor/keyboard-shortcuts-help.tsx` in full. Write the exact same content to `packages/client/src/components/shared/keyboard-shortcuts-help.tsx`. No code changes — just relocate.

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`. Both files coexist temporarily.

- [ ] **Step 3: No commit yet**

---

## Task 5: TopBar component

**Files:**
- Create: `packages/client/src/components/layout/top-bar.tsx`

- [ ] **Step 1: Write the component**

Create `packages/client/src/components/layout/top-bar.tsx` with exactly:

```tsx
import { useMemo } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, HelpCircle, Search, ChevronRight } from 'lucide-react';
import { appRegistry } from '../../apps';
import { useUIStore } from '../../stores/ui-store';
import { useBreadcrumbValue, type BreadcrumbItem } from '../../lib/breadcrumb-context';
import { NotificationBell } from '../notifications/notification-bell';
import { AccountMenu } from './account-menu';

const RAIL_WIDTH = 56;
const TOP_BAR_HEIGHT = 48;

function deriveCrumbsFromRoute(pathname: string, viewParam: string | null): BreadcrumbItem[] {
  // Find the matching app by route prefix
  const navItems = appRegistry.getNavItems();
  const match = navItems.find(({ route }) => pathname === route || pathname.startsWith(route + '/') || pathname.startsWith(route + '?'));
  if (!match) {
    // Platform routes: /settings, /org
    if (pathname.startsWith('/settings')) return [{ label: 'Settings' }];
    if (pathname.startsWith('/org')) return [{ label: 'Organization' }];
    return [];
  }
  const appLabel = match.id.charAt(0).toUpperCase() + match.id.slice(1);
  const crumbs: BreadcrumbItem[] = [{ label: appLabel, to: match.route }];
  if (viewParam) {
    const viewLabel = viewParam
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
    crumbs.push({ label: viewLabel });
  }
  return crumbs;
}

export function TopBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const overrideCrumbs = useBreadcrumbValue();
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const toggleShortcutHelp = useUIStore((s) => s.toggleShortcutHelp);

  const crumbs = useMemo(() => {
    if (overrideCrumbs) return overrideCrumbs;
    return deriveCrumbsFromRoute(location.pathname, searchParams.get('view'));
  }, [overrideCrumbs, location.pathname, searchParams]);

  return (
    <header
      aria-label="Top bar"
      style={{
        position: 'fixed',
        top: 0,
        left: RAIL_WIDTH,
        right: 0,
        height: TOP_BAR_HEIGHT,
        background: 'var(--color-bg-panel)',
        borderBottom: '1px solid var(--color-border-primary)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        zIndex: 29,
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {crumbs.map((item, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              {i > 0 && <ChevronRight size={12} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />}
              {isLast || !item.to ? (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isLast ? 500 : 400,
                    color: isLast ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-family)',
                  }}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-family)',
                  }}
                >
                  {item.label}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: search trigger + bell + help + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => toggleCommandPalette()}
          aria-label={t('commandPalette.search', 'Search or jump to')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 30,
            padding: '0 10px',
            minWidth: 220,
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 6,
            color: 'var(--color-text-tertiary)',
            fontSize: 13,
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
          }}
        >
          <Search size={14} />
          <span>{t('commandPalette.search', 'Search or jump to…')}</span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: '"SF Mono", Menlo, monospace',
              fontSize: 11,
              background: 'var(--color-bg-panel)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 3,
              padding: '1px 5px',
              color: 'var(--color-text-tertiary)',
            }}
          >
            ⌘K
          </span>
        </button>

        <NotificationBell />

        <button
          type="button"
          onClick={() => toggleShortcutHelp()}
          aria-label={t('common.help', 'Help')}
          style={{
            width: 30,
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-hover)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-tertiary)';
          }}
        >
          <HelpCircle size={16} />
        </button>

        <AccountMenu />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -10
```

Expected: `✓ built in ...`.

If there's an error about `appRegistry.getNavItems()[0].route` being undefined or shape mismatched — read `packages/client/src/config/app-registry.ts` and adjust the derivation helper to match the real `NavItem` shape.

If there's no `--color-bg-panel` token, use `var(--color-bg-elevated)` instead (same effective value).

- [ ] **Step 3: No commit yet**

---

## Task 6: Wire TopBar + BreadcrumbProvider + global KeyboardShortcutsHelp in App.tsx

**Files:**
- Modify: `packages/client/src/App.tsx`

- [ ] **Step 1: Add imports**

At the top of `App.tsx`, add:

```tsx
import { TopBar } from './components/layout/top-bar';
import { BreadcrumbProvider } from './lib/breadcrumb-context';
import { KeyboardShortcutsHelp } from './components/shared/keyboard-shortcuts-help';
import { useUIStore } from './stores/ui-store';
```

(If `useUIStore` is already imported elsewhere in App.tsx, skip its import line.)

- [ ] **Step 2: Add TopBarWrapper function**

Near where `AppRailWrapper` is defined (around line 68 in App.tsx), add a sibling function:

```tsx
/** Renders the top bar on authenticated app pages. Same hide-list as the rail, plus Draw. */
function TopBarWrapper() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) return null;

  const hiddenPaths = ['/', '/login', '/register', '/setup', '/onboarding', '/forgot-password'];
  const path = location.pathname;
  if (hiddenPaths.includes(path)) return null;
  if (path.startsWith('/invitation/')) return null;
  if (path.startsWith('/reset-password/')) return null;
  if (path.startsWith('/sign/') || path.startsWith('/proposal/')) return null;
  if (path.startsWith('/drive/upload/')) return null;
  if (path.startsWith('/draw')) return null; // Draw is full-bleed

  return <TopBar />;
}

/** Global mount for the shortcut-help dialog. Fires when useUIStore.shortcutHelpOpen is true. */
function ShortcutHelpWrapper() {
  const open = useUIStore((s) => s.shortcutHelpOpen);
  const toggle = useUIStore((s) => s.toggleShortcutHelp);
  if (!open) return null;
  return <KeyboardShortcutsHelp onClose={toggle} />;
}
```

Note: The real `KeyboardShortcutsHelp` may accept different props. Read `packages/client/src/apps/docs/components/editor/keyboard-shortcuts-help.tsx` to confirm its props, and adjust `<KeyboardShortcutsHelp ... />` to match. If it accepts `{ onClose }`, use `toggle` as the close handler. If it reads the open state itself from the store, drop the `if (!open) return null` gate and the `open`/`toggle` wiring.

- [ ] **Step 3: Wrap Routes with BreadcrumbProvider and mount new wrappers**

Find the top-level tree in `App.tsx`. It currently looks roughly like:

```tsx
return (
  <QueryProvider>
    <ThemeProvider>
      <TooltipProvider>
        <ShortcutProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>...</Routes>
              <AppRailWrapper />
              <CommandPalette />
              ...
            </ErrorBoundary>
          </BrowserRouter>
        </ShortcutProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryProvider>
);
```

Wrap in `BreadcrumbProvider` and add `<TopBarWrapper />` + `<ShortcutHelpWrapper />` alongside `<AppRailWrapper />`:

```tsx
return (
  <QueryProvider>
    <ThemeProvider>
      <TooltipProvider>
        <ShortcutProvider>
          <BrowserRouter>
            <BreadcrumbProvider>
              <ErrorBoundary>
                <Routes>...</Routes>
                <AppRailWrapper />
                <TopBarWrapper />
                <ShortcutHelpWrapper />
                <CommandPalette />
                ...
              </ErrorBoundary>
            </BreadcrumbProvider>
          </BrowserRouter>
        </ShortcutProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryProvider>
);
```

Preserve all existing siblings inside `<ErrorBoundary>` — don't remove anything.

- [ ] **Step 4: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -10
```

Expected: `✓ built in ...`.

- [ ] **Step 5: No commit yet**

---

## Task 7: Remove rail avatar

**Files:**
- Modify: `packages/client/src/components/layout/app-rail.tsx`

- [ ] **Step 1: Remove the AccountSwitcherRail import + render**

In `packages/client/src/components/layout/app-rail.tsx`, find:

```tsx
import { AccountSwitcherRail } from './account-switcher-rail';
```

Delete that line.

Then find the render of `<AccountSwitcherRail />` (inside the footer group) and delete that line.

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 3: No commit yet**

---

## Task 8: Remove NotificationBell from AppSidebar

**Files:**
- Modify: `packages/client/src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Remove import + render**

In `packages/client/src/components/layout/app-sidebar.tsx`:

- Delete the import: `import { NotificationBell } from '../notifications/notification-bell';` (line 6).
- Find `<NotificationBell />` (around line 147) in the sidebar header and delete that line.

The back-button and title in the AppSidebar header stay. Only the bell is removed.

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 3: No commit yet**

---

## Task 9: Remove Docs-local KeyboardShortcutsHelp mount

**Files:**
- Modify: `packages/client/src/apps/docs/components/doc-editor.tsx`

- [ ] **Step 1: Remove import + render**

In `packages/client/src/apps/docs/components/doc-editor.tsx`:

- Find the import of `KeyboardShortcutsHelp` from `./editor/keyboard-shortcuts-help`. Delete that import.
- Find the JSX `<KeyboardShortcutsHelp ... />` render. Delete it.
- If there's any local `useState`/`useUIStore` wiring that was only used to drive this component (e.g. a `shortcutHelpOpen` destructure), also remove that local usage. Do NOT remove the state from `useUIStore` — it's now consumed globally by `ShortcutHelpWrapper` in App.tsx.

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 3: No commit yet**

---

## Task 10: Delete old files

**Files:**
- Delete: `packages/client/src/components/layout/account-switcher-rail.tsx`
- Delete: `packages/client/src/apps/docs/components/editor/keyboard-shortcuts-help.tsx`

- [ ] **Step 1: Verify no remaining imports**

Run the Grep tool with pattern `account-switcher-rail|editor/keyboard-shortcuts-help` across `packages/client/src`, output mode `files_with_matches`.

Expected: zero matches. If anything matches, it's a leftover import — fix it first.

- [ ] **Step 2: Delete the files**

```bash
cd /Users/gorkemcetin/atlasmail
git rm packages/client/src/components/layout/account-switcher-rail.tsx
git rm packages/client/src/apps/docs/components/editor/keyboard-shortcuts-help.tsx
```

- [ ] **Step 3: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 4: No commit yet**

---

## Task 11: Offset app page shells + update ContentArea

**Files:**
- Modify: `packages/client/src/components/ui/content-area.tsx`
- Modify: 11 app page shells (same list as Phase B1, minus Draw).

### Step 1: ContentArea changes

Open `packages/client/src/components/ui/content-area.tsx`. Two changes:

1. Add `subtitle?: string` to the `ContentAreaProps` interface.
2. In the render, when `headerSlot` is not set AND `breadcrumbs` is not set, render `subtitle` on the left (if provided) and actions on the right. If `subtitle` is not provided either, render only actions on the right.

- [ ] **Step 1a: Edit ContentAreaProps interface**

Find the `ContentAreaProps` interface. Add `subtitle?: string;` right after the `title?: string;` line.

- [ ] **Step 1b: Edit the default-path render branch**

Find the final `else` branch (the one that renders `<span>{title ?? ''}</span>` + spacer + actions). Replace its JSX with:

```tsx
          <>
            {subtitle ? (
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-normal)' as CSSProperties['fontWeight'],
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {subtitle}
              </span>
            ) : null}
            <div style={{ flex: 1 }} />
            {actions}
          </>
```

Also update the destructure:

```tsx
export function ContentArea({ title, subtitle, breadcrumbs, actions, headerSlot, children }: ContentAreaProps) {
```

The `title` prop stays in the signature for back-compat but is no longer rendered in the default path. The `breadcrumbs` and `headerSlot` paths are unchanged.

- [ ] **Step 1c: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

### Step 2: Offset 11 app page shells

Each file has an outer `<div>` with `display: 'flex', height: '100vh', overflow: 'hidden', marginLeft: 56` (from Phase B1). Change to add `marginTop: 48; height: 'calc(100vh - 48px)'`.

**Draw is excluded** — keep `marginTop: 0` (the spec's hide-list excludes Draw).

- [ ] **Step 2a: `packages/client/src/apps/crm/page.tsx`**

Outer wrapper div around line 282. Change:
```tsx
<div style={{ display: 'flex', height: '100vh', overflow: 'hidden', marginLeft: 56 }}>
```
To:
```tsx
<div style={{ display: 'flex', height: 'calc(100vh - 48px)', overflow: 'hidden', marginLeft: 56, marginTop: 48 }}>
```

- [ ] **Step 2b: `packages/client/src/apps/hr/page.tsx`** — same pattern.
- [ ] **Step 2c: `packages/client/src/apps/work/page.tsx`** — same pattern.
- [ ] **Step 2d: `packages/client/src/apps/sign/page.tsx`** — same pattern.
- [ ] **Step 2e: `packages/client/src/apps/invoices/page.tsx`** — same pattern.
- [ ] **Step 2f: `packages/client/src/apps/drive/page.tsx`** — same pattern.
- [ ] **Step 2g: `packages/client/src/apps/docs/page.tsx`** — same pattern.
- [ ] **Step 2h: `packages/client/src/apps/system/page.tsx`** — same pattern.
- [ ] **Step 2i: `packages/client/src/pages/calendar.tsx`** — same pattern.
- [ ] **Step 2j: `packages/client/src/pages/org/org-layout.tsx`** — same pattern.
- [ ] **Step 2k: `packages/client/src/pages/settings-page.tsx`** — same pattern. The settings page already has `marginLeft: 56` in its `shellStyle` object inside `SettingsPanelView`. Add `marginTop: 48` and change `height: '100vh'` to `height: 'calc(100vh - 48px)'`.

**Do NOT edit** `packages/client/src/apps/draw/page.tsx` — Draw is excluded.

- [ ] **Step 3: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 4: No commit yet**

---

## Task 12: Final verification + atomic commit

- [ ] **Step 1: Grep sanity check**

Run the Grep tool with pattern `AccountSwitcherRail|editor/keyboard-shortcuts-help` across `packages/client/src` — expected zero results (old files deleted).

Run the Grep tool with pattern `NotificationBell` across `packages/client/src` — expected hits only in:
- `components/notifications/notification-bell.tsx` (the definition)
- `components/layout/top-bar.tsx` (the new mount)

Any other hit means a leftover mount. Fix it.

- [ ] **Step 2: Full build**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -10
```

Expected: `✓ built in ...`. If TS errors, diagnose and fix.

- [ ] **Step 3: Commit everything at once**

```bash
cd /Users/gorkemcetin/atlasmail
git add -A
git commit -m "feat(layout): global top bar + rail avatar relocation + ContentArea title removal"
```

- [ ] **Step 4: Confirm commit**

```bash
git log -1 --stat
```

Expected: one commit touching ~17 files (4 new, 13 modified, 2 deleted).

---

## Task 13: Walkthrough

**Files:** none (testing only).

- [ ] **Step 1: Kill stale + restart dev**

```bash
cd /Users/gorkemcetin/atlasmail
lsof -ti:5180,3001 | xargs kill -9 2>/dev/null
npm run dev
```

Run in background. Wait ~15 seconds.

- [ ] **Step 2: Walk every authenticated route**

In the browser, both light + dark:

1. `/login` — no top bar, no rail. Full-width login.
2. `/` (Home) — no top bar. Colored launcher intact. Rail visible.
3. `/crm` — top bar visible. Breadcrumb: "Crm / Dashboard" (auto-derived from `?view=dashboard`).
4. `/crm?view=deals` — breadcrumb: "Crm / Deals".
5. `/hr` — "Hr / ..." breadcrumb.
6. `/projects`, `/calendar`, `/sign-app`, `/invoices`, `/drive`, `/tasks`, `/docs`, `/system` — each shows a derived breadcrumb.
7. `/draw` — **NO top bar** (full-bleed).
8. `/settings/platform/general` — breadcrumb: "Settings" (or more if override is added later).
9. `/org/members` — breadcrumb: "Organization".
10. Sign-public `/sign/:token` — no top bar.

For each page, confirm:
- ⌘K search trigger opens the palette when clicked.
- Notification bell opens the popover.
- Help button opens the keyboard-shortcuts dialog.
- Avatar opens the account menu (popover, 240px wide).
- **No duplicate bell** in the AppSidebar header.
- **No avatar** in the rail footer anymore.
- Content sits below the top bar (no overlap).

- [ ] **Step 3: Responsive check**

Resize viewport <768px. Top bar behaves the same as rail (currently rail is hidden <768px but top bar was NOT given a hide rule in this plan). Accept: on phone, top bar still visible; rail hidden. Future work.

Actually — the spec says mobile is deferred. At <768px, the top bar still renders at `left: 56` but the rail is hidden, leaving a 56px gap. Cosmetic issue only. Note it in the walkthrough report; fix in a follow-up.

- [ ] **Step 4: No commit**

Testing only.

---

## Rollback

Single commit — `git revert <sha>` restores:
- Avatar back in rail footer.
- Bell back in AppSidebar header.
- No top bar.
- ContentArea renders titles again.
- `KeyboardShortcutsHelp` local in Docs again.

Deleted files come back via the revert.

## Success criteria

- Every authenticated app page except Home, Draw, and public share pages shows the top bar with breadcrumb + ⌘K + bell + help + avatar.
- Breadcrumb reads correctly via auto-derivation.
- ⌘K trigger opens the existing palette.
- Help button opens the shortcut dialog.
- Avatar popover works the same as before, just in a new location.
- No duplicate bells anywhere.
- No test regressions (audit found zero relevant tests).

## Reminders / follow-ups

- **Cross-app ⌘K search:** separate project, not touched here.
- **Nested breadcrumbs:** add `useBreadcrumb([...])` on detail pages (deal detail, invoice detail, document detail, drawing detail). Can ship incrementally.
- **Mobile (<768px) layout:** hide the top bar at the same breakpoint as the rail. Add a media query in `global.css` matching `.app-rail`.
- **i18n:** if `commandPalette.search` / `common.help` keys don't already exist in locale files, add them with fallbacks used in `t('...', 'fallback')`.
