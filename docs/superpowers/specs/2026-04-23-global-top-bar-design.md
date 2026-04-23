# Global Top Bar — Design Spec

**Date:** 2026-04-23
**Scope:** Add a single 48px top bar above every authenticated app page. Contains breadcrumb (left), ⌘K search trigger + notification bell + help + avatar (right). ContentArea loses its title row; per-page actions and an optional subtitle remain. One atomic commit to `main`.

## Why

Phase B1 gave Atlas a left rail for app navigation. But platform-level chrome (global search, inbox, help, account) is still scattered: ⌘K exists but has no visual entry point, the notification bell is only in Drive, help doesn't exist as a global button, and the account switcher sits in the rail footer. Users asked for a "full strip" top bar matching the Linear-inspired sample. This consolidates all cross-cutting chrome into one place.

## Non-goals

- **Broadening ⌘K to cross-app search** — stays CRM-only. Top bar's search box is a stylized trigger for the existing palette.
- **Moving any per-page action** — Search / Filter / +Add stay on the right side of `ContentArea`, not the top bar.
- **New help dialog content** — the help button opens the existing Docs-app `KeyboardShortcutsHelp` promoted to a shared component. Further Help menu options (external docs, support) are future work.
- **Mobile (<768px) responsive layout** — defer, follows the same pattern as the rail.
- **Redesigning ContentArea** beyond removing the title row and keeping actions + optional subtitle.

## What changes

### 1. New: `packages/client/src/components/layout/top-bar.tsx`

A 48px fixed-height sticky bar. Layout:

```
| [Breadcrumb]                              [⌘K search] [🔔] [?] [Avatar] |
```

- `background: var(--color-bg-panel)`, `border-bottom: 1px solid var(--color-border-primary)`, `height: 48`.
- Left side: breadcrumb reads from `useBreadcrumb()` context (see §3) — falls back to auto-derived app-label + view-label.
- Right side, in order:
  - **⌘K search trigger** — a 220px-wide read-only pill styled like an input, showing "Search or jump to…" and a `⌘K` kbd chip. Click = fires the same state change as Cmd+K (opens the existing `command-palette.tsx`).
  - **Notification bell** — the existing `NotificationBell` component dropped in directly.
  - **Help button** — click = `useUIStore.toggleShortcutHelp()`. See §5.
  - **Avatar** — reuse `AccountSwitcherRail`'s inner markup. Refactor that file so the trigger/popover logic is shared between rail and top-bar contexts, OR copy-paste the Avatar + popover into a new `AccountMenu` component that both sites use. Decided: extract into `AccountMenu` (small, clean boundary).

Mounted once in `App.tsx`, with the same hide-list as `AppRailWrapper`: hidden on `/`, auth pages, setup, onboarding, invitation, reset-password, `/sign/*`, `/proposal/*`, `/drive/upload/*`. On visible pages it's `position: sticky; top: 0; z-index: 29` (one below the rail's 30 so the rail's left edge visually sits above if they ever collide).

### 2. Layout offset change

Top bar is a **fixed overlay** positioned at `top: 0; left: 56px; right: 0; height: 48; z-index: 29`. Rail stays at `top: 0; left: 0; width: 56; bottom: 0` — rail visually extends above the top bar's left edge, which is fine (rail's workspace mark is at its top and reads as "the logo"). The z-index is 29, one below the rail's 30, so if they ever visually collide the rail wins.

Every app page's outer shell changes from:

```tsx
<div style={{ display: 'flex', height: '100vh', ... marginLeft: 56 }}>
```

to:

```tsx
<div style={{ display: 'flex', height: 'calc(100vh - 48px)', ... marginLeft: 56, marginTop: 48 }}>
```

This is the same 12 files Phase B1 already edited. Mechanical sweep.

**Draw is excluded from the top bar** (see §6). Draw's page shell keeps its current `marginTop: 0` — no change there.

`TopBarWrapper` is mounted once in `App.tsx`, applies the hide-list, and renders `<TopBar />` on non-excluded routes.

### 3. Breadcrumb: `useBreadcrumb` context + automatic derivation

New file `packages/client/src/lib/breadcrumb-context.tsx`:

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

const BreadcrumbContext = createContext<BreadcrumbContextValue>({ crumbs: null, setCrumbs: () => {} });

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[] | null>(null);
  return <BreadcrumbContext.Provider value={{ crumbs, setCrumbs }}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumb(crumbs: BreadcrumbItem[] | null) {
  const { setCrumbs } = useContext(BreadcrumbContext);
  useEffect(() => {
    setCrumbs(crumbs);
    return () => setCrumbs(null);
  }, [JSON.stringify(crumbs)]);
}

export function useBreadcrumbValue() {
  return useContext(BreadcrumbContext).crumbs;
}
```

Mount `<BreadcrumbProvider>` once near the top of `App.tsx` (inside `QueryProvider` / `ThemeProvider` nesting).

**Automatic derivation in TopBar:** when `useBreadcrumbValue()` returns `null`, TopBar computes:
- App label from the current route: match pathname prefix against `appRegistry.getNavItems()` and get `t(labelKey)`.
- View label from `?view=` URL param if present: look up the i18n key via the existing per-app view maps (CRM, HR, etc. already have them; expose them via a helper).
- Fallback: just the app label.

Pages that want a custom crumb (3-level deep pages like deal detail, invoice detail) call `useBreadcrumb([{ label: 'CRM', to: '/crm' }, { label: 'Deals', to: '/crm?view=deals' }, { label: deal.name }])` and that's that.

### 4. ContentArea change

`packages/client/src/components/ui/content-area.tsx` modified:
- **Drop the title-only render path.** When neither `headerSlot` nor `breadcrumbs` are provided, the header row now shows nothing on the left (the top bar owns it) but still renders `actions` on the right. An optional new prop `subtitle?: string` shows a small muted line on the left.
- Keep `headerSlot` and `breadcrumbs` as-is for backward compat — some apps (Drive, Docs, Calendar) use `headerSlot` heavily and may stay as-is for now.
- The `title` prop becomes effectively optional and unused in the default layout; migrate callers to remove it in a follow-up pass (not part of this commit — just stop displaying it).

**Migration rule:** callers of ContentArea that pass `title` keep passing it harmlessly for now. The TopBar's automatic derivation uses the same source of truth (app registry + view param) so the crumb shows "CRM / Deals" regardless of what the caller put in `title`. Pages that need override call `useBreadcrumb(...)`.

### 5. Help button wires to existing shortcut-help

`useUIStore` already has `shortcutHelpOpen: boolean` and `toggleShortcutHelp()`. The Docs app renders `<KeyboardShortcutsHelp />` conditionally on this flag today.

**Change:** move `KeyboardShortcutsHelp` from `apps/docs/...` to `components/shared/keyboard-shortcuts-help.tsx`. Mount it once in `App.tsx` (conditional on `shortcutHelpOpen`). Docs app no longer mounts it locally.

The Help icon in the top bar is a button that calls `toggleShortcutHelp()`.

### 6. Hide-list for the top bar

Same as `AppRailWrapper`. When hidden:
- `/` (Home — top bar would compete with Home's full-bleed launcher).
- Auth/setup/onboarding/invitation/reset-password.
- `/sign/:token`, `/proposal/:token`, `/drive/upload/:token` (public).
- **Draw (`/draw/*`)** — Draw is intentionally full-bleed per audit note. Add `/draw` to the hide-list. Without the top bar, Draw's page shell also keeps its current `marginTop: 0`.

### 7. Rail avatar removal

`AccountSwitcherRail` no longer renders in the rail footer. Delete the `<AccountSwitcherRail />` render from `app-rail.tsx`. The component itself gets refactored into `<AccountMenu />` and only mounts in the TopBar.

### 8. Drive inline bell removal

Drive's custom header currently mounts `<NotificationBell />`. Remove that line. The top bar's bell covers it. If Drive's custom header has no other content left, consider simplifying — but that's out of scope here unless trivially collapsible.

### 9. i18n

No new strings. Top bar uses existing `sidebar.*` and `settingsPanel.*` label keys for breadcrumb derivation. The search placeholder "Search or jump to…" already exists in `en.json` under the command-palette section (or add a one-liner key if missing, with entries in all 5 locales).

## File-by-file change list

**Create:**
- `packages/client/src/components/layout/top-bar.tsx` — the bar.
- `packages/client/src/components/layout/account-menu.tsx` — shared avatar + popover (extracted from `account-switcher-rail.tsx`).
- `packages/client/src/lib/breadcrumb-context.tsx` — context + hook.
- `packages/client/src/components/shared/keyboard-shortcuts-help.tsx` — shared help dialog (moved from Docs).

**Modify:**
- `packages/client/src/App.tsx` — add `<BreadcrumbProvider>`, `<TopBarWrapper />`, move `<KeyboardShortcutsHelp />` mount here.
- `packages/client/src/components/layout/app-rail.tsx` — remove `<AccountSwitcherRail />` from footer.
- `packages/client/src/components/ui/content-area.tsx` — drop title-only render path; add optional `subtitle` prop.
- 12 app page outer shells — change inline style from `marginLeft: 56; height: 100vh` to `marginLeft: 56; marginTop: 48; height: calc(100vh - 48px)`. Except Draw: stays `marginTop: 0`.
- `packages/client/src/apps/drive/components/...` (the custom header file) — remove `<NotificationBell />`.
- `packages/client/src/apps/docs/...` — remove local `<KeyboardShortcutsHelp />` mount (now global).

**Delete:**
- `packages/client/src/components/layout/account-switcher-rail.tsx` — superseded by `account-menu.tsx`.
- Docs-local keyboard-shortcuts-help file (once moved).

## Test plan

In both light and dark:

1. **Login page** — no top bar.
2. **Home (`/`)** — no top bar. Colorful launcher intact.
3. **CRM dashboard** — top bar visible. Breadcrumb: "CRM / Dashboard". Page actions still on the right of ContentArea.
4. **CRM deals** — breadcrumb updates to "CRM / Deals" as `?view=deals`.
5. **Click a deal → deal detail page** — if deal detail calls `useBreadcrumb([...])`, breadcrumb reads "CRM / Deals / Acme Corp". Otherwise falls back to the derivation (still "CRM / Deals" — acceptable for v1).
6. **HRM, Invoices, Projects, Sign, Drive, Tasks, Docs, System, Settings, Org** — each shows correct derived crumb.
7. **Draw** — no top bar (full-bleed).
8. **Public share pages** — no top bar.
9. **Click ⌘K search in the top bar** → palette opens. Same as pressing Cmd+K.
10. **Click bell** → popover with notifications. On Drive, confirm there's no duplicate bell in the page's header.
11. **Click help (?)** → shortcut-help dialog opens.
12. **Click avatar** → account switcher popover opens (right side now, not from rail footer).
13. **Confirm rail footer no longer shows the avatar.** Settings, Org, Theme toggle still there.
14. **Scroll a long list (CRM Deals)** — top bar stays visible (sticky/fixed behavior).
15. **Resize viewport <768px** — top bar hidden (same responsive rule as rail). Page reclaims top space.

## Risk

Medium. Touches 15+ files in one commit. Biggest failure modes:
- Breaking Draw's full-bleed behavior (handled via hide-list).
- Duplicate bells on Drive (handled via explicit removal).
- A page missing the `marginTop: 48` change silently overlaps the top bar content.
- Breadcrumb context crashes if `BreadcrumbProvider` isn't mounted — the context default (`setCrumbs: () => {}`) handles this safely.

Rollback: `git revert` the commit. Top bar, account-menu, breadcrumb-context files get unmounted; rail avatar returns; Drive bell returns; ContentArea gets its title back.

## Success criteria

- Every authenticated app page except Home and Draw shows the top bar.
- Breadcrumb on each page reads correctly (app + view).
- ⌘K search, bell, help, avatar all functional from the top bar.
- No duplicate bells on Drive.
- Rail footer no longer has the avatar.
- No test regressions (audit found zero relevant tests).

## Reminders / follow-ups

- **Cross-app ⌘K search:** broaden palette to HRM, Invoices, Drive, etc. Separate project.
- **Nested breadcrumbs:** add `useBreadcrumb(...)` calls on detail pages (deal detail, invoice detail, document detail, drawing detail, etc.) for 3-level crumbs. Can ship incrementally — v1 shows 2-level crumb everywhere via derivation.
- **Mobile (<768px) top bar:** when rail gets responsive handling, top bar follows.
