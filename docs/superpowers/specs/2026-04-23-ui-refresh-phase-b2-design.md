# UI Refresh — Phase B2: Desaturate content `app.color`

**Date:** 2026-04-23
**Scope:** Replace 15 per-app-brand-color usages in content/UI with neutral theme tokens. One commit, no config/API changes. Home launcher untouched.

## Why

Phase B1 removed per-app colors from nav chrome (the left rail) but `app.color` still leaks into activity feeds, org settings pages, and linked-record chips across 9 files. Users see a stray orange CRM tint or green HRM tint on unrelated UI, breaking the monochrome alignment the rail established. B2 finishes the job.

## What stays colored (explicit non-goals)

- `pages/home.tsx` — the colored dock launcher on Home is the brand moment.
- `components/layout/global-dock.tsx` — kept intact even though unmounted; if Home ever reuses it, it stays colored.
- `components/icons/app-icons.tsx` — brand SVG icons still used by Home.
- All app `manifest.ts` `color` fields — stay in the manifest so Home can read them.
- User-chosen stage / department / category / tag colors — `app.color` ≠ user's pick; those are never touched.

## File-by-file changes

Each change replaces `app.color` (or equivalent) with a neutral theme token. For chip-style shields used in permissions/access UI, swap to a single accent-subtle pattern so the element still has emphasis but not per-app color.

### 1. `components/notifications/notification-bell.tsx` (lines 173, 201)
Notification dot + related badge currently colored per-app.
- Line 173: `background: appColor` → `background: 'var(--color-accent-primary)'`
- Line 201: same

### 2. `components/activity/activity-feed.tsx` (lines 204, 259)
Activity chip passes `appColor` into `Chip`.
- Drop the `color={appColor}` prop so `Chip` falls back to its neutral styling (transparent with border-primary). If the `Chip` component uses `color` as a required prop, pass `'var(--color-text-tertiary)'` instead.

### 3. `apps/drive/components/linked-records-section.tsx` (lines 30, 56–68)
Linked-record buttons tinted with the linked app's color.
- Border: `app.color` → `var(--color-border-primary)`
- Background tint: drop the color-mix → `var(--color-bg-secondary)`
- Any text color using `app.color` → `var(--color-text-secondary)`

### 4. `pages/org/org-apps.tsx` (lines 183, 220)
- Line 183: card border `app.color + '44'` on enabled state → `var(--color-accent-primary)` (signals "enabled" via accent, same for every app)
- Line 220: icon background `app.color` → `var(--color-bg-tertiary)` with `var(--color-text-secondary)` icon

### 5. `pages/org/org-member-edit.tsx` (lines 449, 455)
- Line 449: row background `color-mix(in srgb, app.color 4%, transparent)` when `hasAccess` → `var(--color-accent-subtle)` (uniform tint for "has access")
- Line 455: checkbox filled-state background `app.color` → `var(--color-accent-primary)` (uniform accent)

### 6. `pages/org/org-members.tsx` (lines 233–234)
App role badge in the members table.
- Background: `app.color` → `var(--color-bg-tertiary)`
- Text: inverse-of-app-color → `var(--color-text-secondary)`
- The badge label (app name) carries the semantic; color isn't needed.

### 7. `components/shared/app-permissions-panel.tsx` (line 236)
Shield icon `color={appColor}` → `color="var(--color-text-tertiary)"`.

### 8. `components/settings/data-model-panel.tsx` (lines 391, 402, 431, 618–619, 659)
ERD visualization + table rows tinted per-app.
- Line 391 (diagram box stroke): `app.color` → `var(--color-border-secondary)`
- Line 402 (accent bar): `app.color` → `var(--color-accent-primary)`
- Line 431 (label text): `app.color` → `var(--color-text-secondary)`
- Lines 618–619 (row icon tile + text): `app.color` → `var(--color-bg-tertiary)` + `var(--color-text-secondary)`
- Line 659 (object chip background): `app.color` → `var(--color-accent-subtle)`

### 9. `config/app-registry.ts` (no change)
Registry keeps exposing `color` on manifests — Home still reads it. Don't touch.

## What doesn't change

- Component APIs.
- App manifests.
- Theme tokens.
- CSS variables.
- Tests (none touch these exact lines; audit confirmed no assertions on rendered color).

## Ship

Single commit: `refactor(ui): Phase B2 — desaturate per-app color in content`.

## Test plan

Walk through in both light and dark:

1. **Notifications bell** — open any notification with an app-attached activity; dot is now accent (indigo), not orange/green/etc.
2. **Activity feed** — any feed rendering `appColor` chip shows neutral chips now.
3. **Drive → Linked records** — click a linked CRM deal; chip border/background now neutral.
4. **Org → Apps** — enabled app cards show accent border, not per-app color.
5. **Org → Members** — expand a member's app access grid; rows with access show accent-subtle tint uniformly.
6. **Org → Members table** — app role badge reads on neutral bg.
7. **Settings → Data model (owner-only panel)** — diagram no longer shows CRM orange / HRM green; uses neutral borders + accent bar.
8. **Home** — launcher STILL colored. Critical. If it goes neutral, revert.

## Risk

Low. All changes are token swaps in presentation code. Zero logic changes. Rollback = `git revert`.

## Reminders

- **Phase C**: 11 non-canonical tables to convert to `DataTable`. Next after B2.
- **Global top bar**: next after C.
