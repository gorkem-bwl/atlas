# UI Refresh — Phase B1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 56px monochrome Lucide-icon rail to the left of every authenticated app page in Atlas. Keep Home's colorful launcher untouched. Remove the globally-mounted `GlobalDock` bottom bar on app pages. Delete the dead `sidebar.tsx` file.

**Architecture:** New `AppRail` component mounted via a wrapper in `App.tsx` (same hide-list pattern as `GlobalDockWrapper`). Uses Lucide icons for every app (not the brand SVGs — those stay for Home). Twelve app/page shell files get a small `marginLeft: 56` nudge to avoid rail overlap. No state, no routing changes, no new dependencies beyond Lucide icons already in the bundle.

**Tech Stack:** React 19, TypeScript, Lucide React (already a dep), React Router v6 (existing), Radix Tooltip (via the existing `Tooltip` wrapper).

---

## File Structure

### Files created (1)
- `packages/client/src/components/layout/app-rail.tsx` — the rail itself (56px fixed-left vertical bar with Lucide icons for every registered app, plus footer with Settings, Org, Account, Theme toggle).

### Files modified (14)
- `packages/client/src/App.tsx` — add `<AppRailWrapper />`, remove `<GlobalDockWrapper />` mount.
- 12 app/page outer shell files — add `marginLeft: 56` to the root `<div>`:
  - `packages/client/src/apps/crm/page.tsx:282`
  - `packages/client/src/apps/hr/page.tsx:~250`
  - `packages/client/src/apps/work/page.tsx`
  - `packages/client/src/apps/sign/page.tsx`
  - `packages/client/src/apps/invoices/page.tsx`
  - `packages/client/src/apps/drive/page.tsx`
  - `packages/client/src/apps/docs/page.tsx`
  - `packages/client/src/apps/draw/page.tsx`
  - `packages/client/src/apps/system/page.tsx`
  - `packages/client/src/pages/calendar.tsx`
  - `packages/client/src/pages/org/org-layout.tsx`
  - `packages/client/src/pages/settings.tsx`
- `packages/client/src/styles/global.css` — add responsive rail-hidden media query (`<768px`).

### Files deleted (1)
- `packages/client/src/components/layout/sidebar.tsx` — dead code, confirmed zero imports.

### Files NOT touched (enforce this in review)
- `packages/client/src/pages/home.tsx` — Home's inline launcher stays.
- `packages/client/src/components/layout/global-dock.tsx` — file stays, just un-mounted.
- `packages/client/src/components/icons/app-icons.tsx` — brand SVGs still used by Home.
- All app manifests (`packages/client/src/apps/*/manifest.ts`) — `color` and icon fields stay.
- All per-app `AppSidebar` usage — untouched.

---

## Task 1: Verify starting state

- [ ] **Step 1: Confirm clean tree and correct branch**

```bash
cd /Users/gorkemcetin/atlasmail
git status
git log -1 --oneline
```

Expected: `nothing to commit, working tree clean`. HEAD should be the B1 spec commit `b103478` or later. If not clean, stop and escalate.

- [ ] **Step 2: Confirm `sidebar.tsx` has zero imports**

Run the Grep tool with pattern `layout/sidebar` across `packages/client/src`, output mode `files_with_matches`.

Expected: zero matches that reference `layout/sidebar` as an import. If anything shows up, stop — the audit claim that sidebar.tsx is dead code was wrong and the plan needs revision.

---

## Task 2: Create the AppRail component

**Files:**
- Create: `packages/client/src/components/layout/app-rail.tsx`

- [ ] **Step 1: Write the AppRail file**

Create `packages/client/src/components/layout/app-rail.tsx` with exactly this content:

```tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Users,
  UserCog,
  FolderKanban,
  Calendar as CalendarIcon,
  FileSignature,
  Receipt,
  HardDrive,
  CheckSquare,
  FileText,
  PenTool,
  Settings,
  Settings2,
  Building2,
  Sun,
  Moon,
  Monitor,
  Grid,
  type LucideIcon,
} from 'lucide-react';
import { appRegistry } from '../../apps';
import { ROUTES } from '../../config/routes';
import { useMyAccessibleApps } from '../../hooks/use-app-permissions';
import { useSettingsStore } from '../../stores/settings-store';
import { AccountSwitcherRail } from './account-switcher-rail';
import { Tooltip } from '../ui/tooltip';
import type { ThemeMode } from '@atlas-platform/shared';

const RAIL_WIDTH = 56;

// Lucide icon per app id. Any app not in the map falls back to Grid.
const RAIL_ICONS: Record<string, LucideIcon> = {
  crm: Users,
  hr: UserCog,
  work: FolderKanban,
  projects: FolderKanban,
  calendar: CalendarIcon,
  sign: FileSignature,
  invoices: Receipt,
  drive: HardDrive,
  tasks: CheckSquare,
  docs: FileText,
  draw: PenTool,
  system: Settings2,
};

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system'];
const THEME_ICONS: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

function RailButton({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = isActive
    ? 'var(--color-accent-primary)'
    : hovered
      ? 'var(--color-text-primary)'
      : 'var(--color-text-tertiary)';

  return (
    <Tooltip content={label} side="right">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          border: 'none',
          background: isActive ? 'var(--color-accent-subtle)' : 'transparent',
          color,
          cursor: 'pointer',
          padding: 0,
          transition: 'background 120ms ease, color 120ms ease',
        }}
      >
        {isActive && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: -10,
              top: 8,
              bottom: 8,
              width: 2,
              borderRadius: 2,
              background: 'var(--color-accent-primary)',
            }}
          />
        )}
        <Icon size={18} strokeWidth={1.75} />
      </button>
    </Tooltip>
  );
}

function ThemeToggleRail() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const current: ThemeMode = theme ?? 'system';
  const Icon = THEME_ICONS[current];

  const handleClick = () => {
    const idx = THEME_CYCLE.indexOf(current);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    setTheme(next);
  };

  return (
    <RailButton
      icon={Icon}
      label={`Theme: ${current}`}
      isActive={false}
      onClick={handleClick}
    />
  );
}

export function AppRail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { data: myApps } = useMyAccessibleApps();

  const navItems = appRegistry.getNavItems();

  // Filter apps by accessibility (same pattern as sidebar.tsx used)
  const visibleApps = navItems.filter(({ id }) => {
    if (!myApps) return false;
    if (myApps.appIds === '__all__') return true;
    return (myApps.appIds as string[]).includes(id);
  });

  const isActive = (route: string) =>
    route === ROUTES.HOME
      ? location.pathname === ROUTES.HOME
      : location.pathname.startsWith(route);

  return (
    <aside
      aria-label="Primary navigation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: RAIL_WIDTH,
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px 0',
        gap: 2,
        zIndex: 30,
      }}
      className="app-rail"
    >
      <RailButton
        icon={Home}
        label={t('sidebar.home', 'Home')}
        isActive={isActive(ROUTES.HOME)}
        onClick={() => navigate(ROUTES.HOME)}
      />

      <div
        aria-hidden="true"
        style={{
          width: 28,
          height: 1,
          background: 'var(--color-border-primary)',
          margin: '6px 0',
          flexShrink: 0,
        }}
      />

      {visibleApps.map(({ id, labelKey, route }) => {
        const Icon = RAIL_ICONS[id] ?? Grid;
        return (
          <RailButton
            key={id}
            icon={Icon}
            label={t(labelKey, id.charAt(0).toUpperCase() + id.slice(1))}
            isActive={isActive(route)}
            onClick={() => navigate(route)}
          />
        );
      })}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div
          aria-hidden="true"
          style={{
            width: 28,
            height: 1,
            background: 'var(--color-border-primary)',
            margin: '6px 0',
            flexShrink: 0,
          }}
        />
        <RailButton
          icon={Building2}
          label={t('sidebar.organization', 'Organization')}
          isActive={isActive(ROUTES.ORG)}
          onClick={() => navigate(ROUTES.ORG)}
        />
        <RailButton
          icon={Settings}
          label={t('sidebar.settings', 'Settings')}
          isActive={isActive(ROUTES.SETTINGS)}
          onClick={() => navigate(ROUTES.SETTINGS)}
        />
        <ThemeToggleRail />
        <AccountSwitcherRail />
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit the scaffold**

The file imports `./account-switcher-rail` which doesn't exist yet — Task 3 creates it. That import will cause a build error until Task 3 lands. **Do not commit after this step.** Proceed directly to Task 3, then commit both files together in Task 3 Step 3.

---

## Task 3: Create the AccountSwitcherRail helper

**Files:**
- Create: `packages/client/src/components/layout/account-switcher-rail.tsx`

The existing `AccountSwitcher` renders a full-width avatar-plus-name trigger and expands its dropdown to the trigger's width. That doesn't fit a 56px rail. We need an icon-only trigger (avatar only) that opens a fixed-width dropdown anchored to the rail.

- [ ] **Step 1: Write the file**

Create `packages/client/src/components/layout/account-switcher-rail.tsx` with exactly:

```tsx
import { useState, useRef, useEffect } from 'react';
import { ChevronRight, LogOut, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { Avatar } from '../ui/avatar';
import { Tooltip } from '../ui/tooltip';
import { ConfirmDialog } from '../ui/confirm-dialog';
import type { Account } from '@atlas-platform/shared';

export function AccountSwitcherRail() {
  const { account, accounts, switchAccount, removeAccount, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSwitch = (accountId: string) => {
    switchAccount(accountId);
    setOpen(false);
  };

  const executeRemove = (accountId: string) => {
    const isActive = account?.id === accountId;
    if (isActive && accounts.length <= 1) {
      logout();
    } else {
      removeAccount(accountId);
    }
  };

  if (!account) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <Tooltip content={account.name || account.email} side="right">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Switch account"
          aria-haspopup="menu"
          aria-expanded={open}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <Avatar src={account.pictureUrl} name={account.name} email={account.email} size={26} />
        </button>
      </Tooltip>

      {open && (
        <div
          role="menu"
          aria-label="Account switcher"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 'calc(100% + 10px)',
            width: 240,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-elevated)',
            padding: 6,
            zIndex: 200,
          }}
        >
          {accounts.map((acc: Account) => {
            const isActive = acc.id === account.id;
            return (
              <div
                key={acc.id}
                role="menuitem"
                onClick={() => handleSwitch(acc.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: isActive ? 'var(--color-surface-selected)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--color-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Avatar src={acc.pictureUrl} name={acc.name} email={acc.email} size={28} />
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {acc.name || acc.email}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {acc.email}
                  </div>
                </div>
                {isActive && <Check size={14} style={{ color: 'var(--color-accent-primary)' }} />}
              </div>
            );
          })}

          <div
            aria-hidden="true"
            style={{
              height: 1,
              background: 'var(--color-border-primary)',
              margin: '6px 0',
            }}
          />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirmRemoveId(account.id);
            }}
            role="menuitem"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              padding: '8px 10px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}

      {confirmRemoveId && (
        <ConfirmDialog
          open={!!confirmRemoveId}
          title="Sign out?"
          description="You will be signed out of this account."
          confirmLabel="Sign out"
          onConfirm={() => {
            const id = confirmRemoveId;
            setConfirmRemoveId(null);
            executeRemove(id);
          }}
          onCancel={() => setConfirmRemoveId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build succeeds so far**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -8
```

Expected: `✓ built in ...`. If TypeScript errors, read them and fix. Common issues:
- `ConfirmDialog` prop mismatch — read `packages/client/src/components/ui/confirm-dialog.tsx` and adjust prop names.
- `useSettingsStore.setTheme` might not exist — read `packages/client/src/stores/settings-store.ts` and adjust method name (could be `setThemeMode` or a nested setter).
- `Avatar` component props — read `packages/client/src/components/ui/avatar.tsx` and adjust.

If any of those mismatch, fix the component import signature only — do not rewrite the component logic.

- [ ] **Step 3: Commit the two new files**

```bash
git add packages/client/src/components/layout/app-rail.tsx packages/client/src/components/layout/account-switcher-rail.tsx
git commit -m "feat(layout): AppRail component — 56px monochrome Lucide icon rail"
```

---

## Task 4: Wire the rail into App.tsx

**Files:**
- Modify: `packages/client/src/App.tsx`

- [ ] **Step 1: Add the AppRailWrapper function and remove the GlobalDockWrapper mount**

Open `packages/client/src/App.tsx`. Find the `GlobalDockWrapper` function around line 69 and add a new `AppRailWrapper` beside it using the same hide-list pattern. Then replace the place where `<GlobalDockWrapper />` is rendered with `<AppRailWrapper />`.

Replace:

```tsx
import { GlobalDock } from './components/layout/global-dock';
```

with:

```tsx
import { AppRail } from './components/layout/app-rail';
```

Replace the whole `GlobalDockWrapper` function:

```tsx
/** Renders the global dock on authenticated app pages, but NOT on home, login, setup, etc. */
function GlobalDockWrapper() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) return null;

  // Hide on pages that have their own dock or are non-app pages
  const hiddenPaths = ['/', '/login', '/register', '/setup', '/onboarding', '/forgot-password'];
  const path = location.pathname;
  if (hiddenPaths.includes(path)) return null;
  if (path.startsWith('/invitation/')) return null;
  if (path.startsWith('/reset-password/')) return null;
  if (path.startsWith('/sign/') || path.startsWith('/proposal/')) return null;
  if (path.startsWith('/drive/upload/')) return null;

  return <GlobalDock />;
}
```

with:

```tsx
/** Renders the app rail on authenticated app pages. Hidden on Home, auth pages, and public share pages. */
function AppRailWrapper() {
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

  return <AppRail />;
}
```

Then find where `<GlobalDockWrapper />` is rendered (grep inside App.tsx) and replace with `<AppRailWrapper />`.

- [ ] **Step 2: Build check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`.

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/App.tsx
git commit -m "feat(layout): mount AppRail on app pages, retire GlobalDock mount"
```

---

## Task 5: Add marginLeft to each app page outer shell

**Files:**
- Modify: 12 files listed below.

Each of these 12 files has a return-statement outermost `<div>` that lays out its page. We need to add `marginLeft: 56` to that div's inline style so content doesn't sit under the rail. Pattern:

```tsx
// Before
<div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
// After
<div style={{ display: 'flex', height: '100vh', overflow: 'hidden', marginLeft: 56 }}>
```

Do NOT wrap in a new div, do NOT change the existing layout — just add the property.

- [ ] **Step 1: Modify `packages/client/src/apps/crm/page.tsx`**

Find the outermost `<div>` at line ~282 (returned JSX). Add `marginLeft: 56` to its inline style object.

- [ ] **Step 2: Modify `packages/client/src/apps/hr/page.tsx`**

Find the outermost `<div>` in its return (~line 249). Add `marginLeft: 56`.

- [ ] **Step 3: Modify `packages/client/src/apps/work/page.tsx`**

Same pattern. Add `marginLeft: 56` to outer shell.

- [ ] **Step 4: Modify `packages/client/src/apps/sign/page.tsx`**

Same. Add `marginLeft: 56`.

- [ ] **Step 5: Modify `packages/client/src/apps/invoices/page.tsx`**

Same. Add `marginLeft: 56`.

- [ ] **Step 6: Modify `packages/client/src/apps/drive/page.tsx`**

Same. Add `marginLeft: 56`.

- [ ] **Step 7: Modify `packages/client/src/apps/docs/page.tsx`**

Same. Add `marginLeft: 56`.

- [ ] **Step 8: Modify `packages/client/src/apps/draw/page.tsx`**

Draw uses full-bleed Excalidraw. Same treatment: add `marginLeft: 56` to the outer wrapper div so the canvas doesn't render under the rail. If Draw uses `position: fixed` with `left: 0`, change `left: 0` to `left: 56` instead.

- [ ] **Step 9: Modify `packages/client/src/apps/system/page.tsx`**

Same. Add `marginLeft: 56`.

- [ ] **Step 10: Modify `packages/client/src/pages/calendar.tsx`**

Same. Add `marginLeft: 56`.

- [ ] **Step 11: Modify `packages/client/src/pages/org/org-layout.tsx`**

Same. Add `marginLeft: 56`.

- [ ] **Step 12: Modify `packages/client/src/pages/settings.tsx`**

Settings is special — it's sometimes rendered as a modal (`SettingsModal` in App.tsx) and sometimes as a page (`SettingsPage`). The full-page version needs the offset; the modal doesn't. Add `marginLeft: 56` ONLY to the `SettingsPage` return, not `SettingsModal`.

- [ ] **Step 13: Verify build passes after all 12**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`. If not, inspect the failing file and fix the JSX typo.

- [ ] **Step 14: Commit all 12 in one commit**

```bash
git add packages/client/src/apps packages/client/src/pages
git commit -m "feat(layout): offset app pages by 56px for the app rail"
```

---

## Task 6: Responsive hide on phone widths

**Files:**
- Modify: `packages/client/src/styles/global.css`

On <768px the rail disappears. No replacement nav — that's deferred per the B1 spec.

- [ ] **Step 1: Append the media query to `global.css`**

Read the current file, then append at the end:

```css

/* App rail — hide on phone widths. Mobile nav is handled in a later phase. */
@media (max-width: 767px) {
  .app-rail {
    display: none;
  }
}
```

The rail component already has `className="app-rail"` from Task 2.

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/styles/global.css
git commit -m "feat(layout): hide app rail below 768px"
```

---

## Task 7: Delete the dead sidebar.tsx

**Files:**
- Delete: `packages/client/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Confirm no imports one more time**

Use the Grep tool with pattern `layout/sidebar` across `packages/client/src` output mode `files_with_matches`.

Expected: zero matches. If anything matches, stop. Do not delete.

- [ ] **Step 2: Delete the file**

```bash
cd /Users/gorkemcetin/atlasmail
git rm packages/client/src/components/layout/sidebar.tsx
```

- [ ] **Step 3: Build to confirm nothing broke**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...`. If any module-not-found error surfaces, a dynamic import (e.g. `lazy(() => import('...'))`) was missed by the grep. Inspect and resolve.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(layout): delete dead sidebar.tsx — superseded by AppRail"
```

---

## Task 8: Full-platform visual walkthrough

**Files:** none (testing only)

- [ ] **Step 1: Kill stale processes + start dev server**

```bash
cd /Users/gorkemcetin/atlasmail
lsof -ti:5180,3001 | xargs kill -9 2>/dev/null
npm run dev
```

Run in background. Wait ~15 seconds for the server to boot.

- [ ] **Step 2: Check server output**

Tail the background task output. Expect the server to log `Atlas server running on port 3001` and the client to log `VITE ... ready`.

- [ ] **Step 3: Open every route in the browser**

Visit these URLs in order and verify each in both light AND dark mode (toggle from the rail):

1. `http://localhost:5180/login` — no rail expected, clean login form.
2. `http://localhost:5180/` — no rail, Home launcher visible and colorful as before.
3. `http://localhost:5180/crm` — rail visible at left (56px). Active icon: CRM. Content doesn't overlap rail.
4. `http://localhost:5180/hr` — rail, active: HRM.
5. `http://localhost:5180/projects` or `/work` — rail, active: Projects.
6. `http://localhost:5180/calendar` — rail, active: Calendar.
7. `http://localhost:5180/sign-app` — rail, active: Sign.
8. `http://localhost:5180/invoices` — rail, active: Invoices.
9. `http://localhost:5180/drive` — rail, active: Drive.
10. `http://localhost:5180/tasks` — rail, active: Tasks.
11. `http://localhost:5180/docs` — rail, active: Docs.
12. `http://localhost:5180/draw` — rail, active: Draw. **Critical:** Excalidraw canvas does not render underneath the rail.
13. `http://localhost:5180/system` — rail, active: System.
14. `http://localhost:5180/settings` — rail visible (full-page variant), Settings icon active in rail footer.
15. `http://localhost:5180/org/members` — rail visible, Organization icon active.

For each, confirm:
- Hovering any rail icon shows its tooltip to the right.
- Clicking an icon navigates.
- The active icon has an accent-tinted pill background + left edge accent bar.
- Keyboard Tab lands on rail icons and shows the Phase A focus ring.

- [ ] **Step 4: Test responsive**

Open DevTools → device toolbar → resize to 400px wide. The rail should disappear. Content shifts left. No hamburger replacement — that's expected for B1.

- [ ] **Step 5: Test Home**

Go back to `http://localhost:5180/`. Rail NOT visible. Home's inline launcher works as before (click an app tile → navigates to the app).

- [ ] **Step 6: No commit**

Testing task only.

---

## Task 9: Version bump & release (asks user first)

**Files:**
- Modify: `packages/client/src/config/version.ts`
- Modify: `packages/client/package.json`
- Modify: `packages/server/package.json`
- Modify: `packages/shared/package.json`
- Modify: `README.md`

- [ ] **Step 1: STOP — ask user for release permission**

Per project memory every tag/release requires fresh explicit permission. Ask:

> "Phase B1 is implemented and walked through. Ready to bump to `v2.5.0` (minor — structural UI change is a feature) and cut a release? Needs explicit yes."

Wait for a yes. If "not yet," stop here.

- [ ] **Step 2: Bump `APP_VERSION`**

Edit `packages/client/src/config/version.ts`:

```ts
export const APP_VERSION = '2.5.0';
```

- [ ] **Step 3: Bump version in all three package.json files**

Change `"version": "2.4.0"` → `"version": "2.5.0"` in each of:
- `packages/client/package.json`
- `packages/server/package.json`
- `packages/shared/package.json`

- [ ] **Step 4: Update README pin example**

Change `IMAGE_TAG=2.4.0` → `IMAGE_TAG=2.5.0` in `README.md`.

- [ ] **Step 5: Commit, tag, push, release**

```bash
git add packages/client/src/config/version.ts packages/client/package.json packages/server/package.json packages/shared/package.json README.md
git commit -m "chore: bump version to 2.5.0"
git tag v2.5.0
git push origin main
git push origin v2.5.0
```

Then:

```bash
gh release create v2.5.0 --title "v2.5.0" --notes "$(cat <<'EOF'
## Phase A + B1 UI refresh

### Phase A (shipped tokens + typography)
- Replaced dull #5A7FA0 with accent-aligned tokens for links/info
- DataTable headers: 11px, weight 500, uppercase
- Primary button has a subtle accent-tinted shadow
- Global 3px accent focus ring on keyboard focus
- Warmer dark-mode panels, cleaner badge contrast
- Consolidated three competing :focus-visible rules into one
- Fixed text-on-colored-surface contrast regression (use --color-text-inverse)

### Phase B1 (structural — this release)
- New 56px monochrome app rail on every authenticated app page
- Monochrome Lucide icons per app (brand SVGs stay on Home only)
- Accent-tinted pill + left-edge bar for active app
- Tooltip on hover
- Home page keeps its colorful launcher — unchanged
- Global bottom dock retired on app pages (Home's inline launcher is separate)
- Deleted the dead sidebar.tsx file

### What's not in this release
- Phase B2: desaturate per-app brand colors in content (activity feed, org settings, SmartButtonBar)
- Phase B3: clean up leftover GlobalDock code + BRAND_ICON_BACKGROUNDS
- Phase C: convert 11 non-canonical tables to DataTable

## Upgrade

\`\`\`bash
IMAGE_TAG=2.5.0 docker compose -f docker-compose.production.yml up -d
\`\`\`
EOF
)"
```

- [ ] **Step 6: Verify Docker workflow started**

```bash
gh run list --workflow=docker.yml --limit 1
```

Expected: `in_progress` for `v2.5.0`.

---

## Rollback

Every task's commit is atomic and safe to revert via `git revert <sha>`. If post-ship something looks wrong, the fastest rollback is `git revert` on the Task 4 commit (which re-mounts GlobalDock and unmounts AppRail). The rail component file and marginLeft changes can stay in the tree without rendering anything.

## Reminders for future phases

- **B2**: desaturate `app.color` in activity feed, org/settings pages, SmartButtonBar.
- **B3**: delete `global-dock.tsx` if Home doesn't use it; clean up `BRAND_ICON_BACKGROUNDS` maps; simplify brand SVGs to monochrome if desired.
- **Phone nav (<768px)**: top-bar hamburger or bottom tab bar. Separate spec.
- **Phase C**: 11 non-canonical tables to convert (see Phase A spec appendix).
