# UI Refresh — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Linear-inspired token and typography refresh from the spec at `docs/superpowers/specs/2026-04-23-ui-refresh-phase-a-design.md`. No component API changes, no structural changes.

**Architecture:** Atlas reads almost all color/typography from CSS variables declared in `packages/client/src/styles/theme.css`. Most of the refresh is a single-file token swap in both the light (`:root, [data-theme="light"]`) and dark (`[data-theme="dark"]`) blocks. A small number of shared components (`column-header.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `button.tsx`) use inline styles and need minor edits to pick up the new focus-ring standard. A global `:focus-visible` rule in `ui.css` covers any remaining interactive elements. Finally, a handful of files hardcode hex — those are converted to tokens.

**Tech Stack:** React 19, TypeScript, Vite, inline-style components, CSS variables in `theme.css`, `:focus-visible` selector for focus ring.

---

## File Structure

### Files we will modify
- `packages/client/src/styles/theme.css` — both `:root, [data-theme="light"]` and `[data-theme="dark"]` blocks
- `packages/client/src/styles/ui.css` — add global `:focus-visible` rule block
- `packages/client/src/components/ui/column-header.tsx` — uppercase + letter-spacing + weight 500
- `packages/client/src/components/ui/input.tsx` — focus-ring box-shadow, background uses new `--color-bg-tertiary` (already via token)
- `packages/client/src/components/ui/select.tsx` — focus-ring box-shadow
- `packages/client/src/components/ui/textarea.tsx` — focus-ring box-shadow
- `packages/client/src/components/ui/button.tsx` — subtle shadow on primary variant
- `packages/client/src/apps/crm/components/lead-forms-view.tsx` — hex → tokens

### Files we will not touch (explicitly)
- `apps/sign/components/signature-modal.tsx` canvas ink `#000000` — literal black ink, not chrome
- `apps/docs/components/editor/bubble-toolbar.tsx` color-picker swatches — user-visible color values
- Dashboard chart series colors (e.g. `#3b82f6`, `#8b5cf6`) — user-visible data series, not chrome
- `--email-list-*` / `--color-category-newsletters` / `--color-star` leftovers — housekeeping PR

### No new files, no DB changes, no server changes, no new routes.

---

## Task 1: Create the working branch (wait — we push to main only)

Per project memory: Atlas **never** creates feature branches. All commits go directly to `main`. Skip branch creation entirely. Each task below ends with a commit that will be pushed to `main` by the user at the end.

- [x] **Step 1: Verify working tree clean before starting**

Run: `git status`
Expected: `nothing to commit, working tree clean` (one commit ahead of origin/main from the spec is fine)

---

## Task 2: Bump light-mode color tokens

**Files:**
- Modify: `packages/client/src/styles/theme.css` (light block, lines ~1–78)

- [ ] **Step 1: Replace the light-mode color block**

Open `packages/client/src/styles/theme.css`. Replace the `:root,\n[data-theme="light"] {` block's color assignments (lines 1–42 approximately — up through the gradient definitions) with the new values below. Leave spacing/radius/font tokens alone in this task. Leave the `--sidebar-*` block for step 2 of this task.

New values to apply in the light block:

```css
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #fafafa;
  --color-bg-tertiary: #f7f7f8;
  --color-bg-elevated: #ffffff;
  --color-bg-overlay: rgba(15, 15, 20, 0.45);
  --color-surface-primary: #ffffff;
  --color-surface-hover: #f1f1f2;
  --color-surface-active: #ebecee;
  --color-surface-selected: #f0f1fd;
  --color-text-primary: #1c1e21;
  --color-text-secondary: #4d525c;
  --color-text-tertiary: #7e838e;
  --color-text-inverse: #ffffff;
  --color-text-link: #5e6ad2;
  --color-border-primary: #e6e7ea;
  --color-border-secondary: #ebedf1;
  --color-border-focus: #5e6ad2;
  --color-accent-primary: #5e6ad2;
  --color-accent-primary-hover: #4a55b8;
  --color-accent-primary-active: #3f48a3;
  --color-accent-subtle: color-mix(in srgb, #5e6ad2 10%, transparent);
  --color-accent-subtle-hover: color-mix(in srgb, #5e6ad2 16%, transparent);
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #e5484d;
  --color-info: #3b82f6;
  --color-unread-indicator: #5e6ad2;
  --color-star: #d4a017;
  --color-category-important: #5e6ad2;
  --color-category-other: #7a8495;
  --color-category-newsletters: #8b6cc4;
  --color-category-notifications: #c47a3a;
```

Do **not** change the shadow/gradient lines that follow — they already reference other tokens.

- [ ] **Step 2: Update light `--sidebar-*` tokens at the bottom of the light block**

Replace the sidebar block near line 74:

```css
  --sidebar-bg: #fbfbfc;
  --sidebar-text: rgb(18, 18, 18);
  --sidebar-active: #f0f1fd;
  --sidebar-hover: #f1f1f2;
```

- [ ] **Step 3: Start the dev server and smoke-test light mode**

Run these in two separate terminals (or background one):

```bash
cd /Users/gorkemcetin/atlasmail
lsof -ti:5180,3001 | xargs kill -9 2>/dev/null; docker compose up -d
npm run dev
```

Open http://localhost:5180, log in, visit **Home, HRM employees list, CRM dashboard**. Confirm:
- Page background is warmer (less blue, off-white)
- Link text and info text are indigo `#5e6ad2`, not dull blue
- Border hairlines lighter, not heavy
- Error badges/text are red, not pink

If anything is severely broken (e.g. white text on white), stop and report back. Otherwise proceed.

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/styles/theme.css
git commit -m "refactor(theme): light-mode tokens for Linear-inspired refresh"
```

---

## Task 3: Bump dark-mode color tokens

**Files:**
- Modify: `packages/client/src/styles/theme.css` (dark block, lines ~80–125)

- [ ] **Step 1: Replace the dark-mode color block**

In the `[data-theme="dark"] {` block, replace the color assignments with:

```css
  --color-bg-primary: #0f1012;
  --color-bg-secondary: #17181b;
  --color-bg-tertiary: #1c1d20;
  --color-bg-elevated: #17181b;
  --color-bg-overlay: rgba(0, 0, 0, 0.6);
  --color-surface-primary: #17181b;
  --color-surface-hover: #23242a;
  --color-surface-active: #2e323c;
  --color-surface-selected: #24253a;
  --color-text-primary: #edeef2;
  --color-text-secondary: #b8bcc5;
  --color-text-tertiary: #858994;
  --color-text-inverse: #0f1012;
  --color-text-link: #8b94ea;
  --color-border-primary: #26272c;
  --color-border-secondary: #36383f;
  --color-border-focus: #8b94ea;
  --color-accent-primary: #8b94ea;
  --color-accent-primary-hover: #a4abef;
  --color-accent-primary-active: #6974d0;
  --color-accent-subtle: color-mix(in srgb, #8b94ea 14%, transparent);
  --color-accent-subtle-hover: color-mix(in srgb, #8b94ea 22%, transparent);
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-error: #f87171;
  --color-info: #60a5fa;
  --color-unread-indicator: #8b94ea;
  --color-star: #d4b040;
  --color-category-important: #8b94ea;
  --color-category-other: #9ba2b0;
  --color-category-newsletters: #a48bd4;
  --color-category-notifications: #d4954a;
```

- [ ] **Step 2: Update dark `--sidebar-*` tokens at the bottom of the dark block**

Replace:

```css
  --sidebar-bg: #131418;
  --sidebar-text: #edeef2;
  --sidebar-active: #24253a;
  --sidebar-hover: #23242a;
```

- [ ] **Step 3: Smoke-test dark mode**

In the browser, flip to dark (Settings → Theme, or whatever Atlas offers). Visit **Home, HRM, CRM**. Confirm:
- Dropdowns in popovers render dark (were OS-chrome light before because of native `<select>` — Atlas already uses custom Select, so should just work)
- Accent blue lifts to a lighter indigo (`#8b94ea`), readable against dark panels
- Warning/error badges glow, not shout
- Input backgrounds feel slightly inset vs panels

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/styles/theme.css
git commit -m "refactor(theme): dark-mode tokens for Linear-inspired refresh"
```

---

## Task 4: Tighten font weight tokens

**Files:**
- Modify: `packages/client/src/styles/theme.css` (the font-weight lines)

These four lines appear in the light block (they're not duplicated in dark). Current values `420/520/620/720` are intentional for Geist — but the refresh direction leans on 500/600/700 for weights that render uniformly across Inter/Geist/system-ui. Keep `normal: 420` (Geist body-text compensation); bump the rest down.

- [ ] **Step 1: Update font-weight tokens**

Change:

```css
  --font-weight-normal: 420;
  --font-weight-medium: 520;
  --font-weight-semibold: 620;
  --font-weight-bold: 720;
```

To:

```css
  --font-weight-normal: 420;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
```

- [ ] **Step 2: Smoke-test**

Reload the app. Bold text anywhere (page titles, table headers that are still 620, modal titles) should look slightly less heavy. If anything looks *too* light, revert only that weight and note which. Most consumers read from tokens so the change should be invisible except for overall text feeling airier.

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/styles/theme.css
git commit -m "refactor(theme): align font-weight tokens to standard 500/600/700"
```

---

## Task 5: Add global focus-ring rule

**Files:**
- Modify: `packages/client/src/styles/ui.css` (append a new block at the end)

Atlas components apply focus via inline `onFocus` setting `borderColor` to `--color-border-focus`. To add a halo ring without rewriting every component's focus handler, use a global CSS rule keyed on `:focus-visible`. This fires only for keyboard focus, not mouse click, which matches modern UX patterns.

- [ ] **Step 1: Append the focus-ring rule to `ui.css`**

Read the current file to confirm the last line, then append (leave existing content untouched):

```css
/* ─── Global focus ring (keyboard focus only) ──────────────────── */

:where(input, select, textarea, button, [role="button"], [role="menuitem"], [role="option"], [tabindex]):focus-visible {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-primary) 18%, transparent);
  border-color: var(--color-border-focus);
}

/* Disable default browser focus outline in favour of our ring. */
:where(input, select, textarea, button):focus {
  outline: none;
}
```

The `:where()` keeps specificity at zero so any component with its own focus rule still wins.

- [ ] **Step 2: Smoke-test focus ring**

Reload. Click into a text input with **mouse** — should NOT show ring (no `:focus-visible`). `Tab` to the same input from keyboard — should show the 3px accent halo. Same for `<button>`. Both light and dark mode.

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/styles/ui.css
git commit -m "feat(ui): global keyboard-focus ring using accent color"
```

---

## Task 6: DataTable column header typography

**Files:**
- Modify: `packages/client/src/components/ui/column-header.tsx`

Current header is 12px at weight 620 in tertiary gray — reads dark and heavy. Refresh makes it 11px / 500 / uppercase with letter-spacing.

- [ ] **Step 1: Update the `style` object and hover handlers**

In `column-header.tsx`, inside the `<span>` element, change the style block from:

```tsx
style={{
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)',
  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
  fontFamily: 'var(--font-family)',
  cursor: sortable ? 'pointer' : 'default',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  transition: 'color var(--transition-fast)',
  outline: 'none',
  ...style,
}}
```

To:

```tsx
style={{
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
  fontFamily: 'var(--font-family)',
  cursor: sortable ? 'pointer' : 'default',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  transition: 'color var(--transition-fast)',
  outline: 'none',
  ...style,
}}
```

Hover handlers (lines 60–65) stay — they're fine. Sort-arrow icons stay at `size={10}`.

- [ ] **Step 2: Smoke-test every DataTable in the app**

Visit in both light and dark:
- CRM leads / contacts / deals / activities lists
- HRM employees list
- Invoices list, recurring invoices
- Projects list view
- Tasks list view

For each, confirm column headers are:
- 11px, clearly lighter weight than row text
- UPPERCASE with visible letter spacing
- Muted gray when idle, near-black when you click to sort
- Still sortable (click-to-sort still works)

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/ui/column-header.tsx
git commit -m "refactor(ui): DataTable headers — 11px, weight 500, uppercase"
```

---

## Task 7: Button primary subtle shadow

**Files:**
- Modify: `packages/client/src/components/ui/button.tsx`

Adds a small accent-tinted shadow to primary buttons for subtle lift. Danger/secondary/ghost stay flat.

- [ ] **Step 1: Update the `primary` variant style**

In `button.tsx`, change the `primary` entry in `variantStyles` from:

```tsx
primary: {
  background: 'var(--color-accent-primary)',
  color: '#ffffff',
  border: '1px solid transparent',
},
```

To:

```tsx
primary: {
  background: 'var(--color-accent-primary)',
  color: '#ffffff',
  border: '1px solid transparent',
  boxShadow: '0 1px 2px color-mix(in srgb, var(--color-accent-primary) 25%, transparent)',
},
```

- [ ] **Step 2: Smoke-test primary buttons**

Open any page with a primary button (HRM → **+ Add employee**, CRM → **+ New lead**, any modal footer confirm). Confirm:
- A subtle glow sits under the button, same hue as the button, not a generic black drop shadow
- On hover the background shifts to `--color-accent-primary-hover` (already wired) — shadow stays

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/components/ui/button.tsx
git commit -m "feat(ui): subtle accent shadow on primary button"
```

---

## Task 8: Confirm Input/Select/Textarea pick up the focus ring (no code change expected)

The global `:focus-visible` rule from Task 5 should already apply to these components. This task verifies — no edits unless the ring doesn't fire.

- [ ] **Step 1: Verify focus ring on Input, Select, Textarea**

Visit HRM → **+ Add employee** modal (or any form). Tab through the fields from keyboard. Each should show the 3px accent halo on focus in both light and dark.

If any control swallows the focus ring (e.g. because its own `onFocus` handler sets `boxShadow: 'none'`), find that handler and change it to preserve / apply the ring. Inspect element to see what's winning.

Expected fields to touch:
- `Input` (`components/ui/input.tsx`) — already confirmed: sets `borderColor` only, no boxShadow — ring should show
- `Select` (`components/ui/select.tsx`)
- `Textarea` (`components/ui/textarea.tsx`)

- [ ] **Step 2: If no fixes needed, skip commit. Otherwise:**

```bash
git add packages/client/src/components/ui/<file-that-was-fixed>.tsx
git commit -m "fix(ui): preserve keyboard focus ring on <component>"
```

---

## Task 9: Fix inline hex in `lead-forms-view.tsx`

**Files:**
- Modify: `packages/client/src/apps/crm/components/lead-forms-view.tsx`

Audit flagged this file for hardcoded hex. Replace chrome hex with tokens; leave the `#13715B` Atlas teal (it's a brand override for form embed preview, intentional).

- [ ] **Step 1: Open and grep for hex**

Open the file and search for `#111318`, `#ef4444`, and any other `#` that aren't `#13715B`.

- [ ] **Step 2: Replace matches**

For each occurrence:
- `#111318` → `var(--color-text-primary)`
- `#ef4444` → `var(--color-error)`
- `#13715B` → **leave as-is** (intentional teal brand accent)

Use Edit tool per match. If a hex sits inside a JSX string literal (e.g. `style="color: #111318"`), replace it inline; if it's a JS string, same treatment.

- [ ] **Step 3: Smoke-test CRM lead forms**

Visit CRM → Settings → Lead forms (or wherever this view renders — search `lead-forms-view` in routes). Create or preview a form. Confirm nothing looks visibly different (tokens should resolve to the same or near-same colors as before the refresh).

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/apps/crm/components/lead-forms-view.tsx
git commit -m "refactor(crm): replace inline hex with theme tokens in lead-forms-view"
```

---

## Task 10: Scan for other chrome hex (light touch-up)

This task sweeps for any other `color: '#6b7280'` or similar chrome hex in app components that should use tokens. Skip charts, canvases, color-picker swatches — those are data, not chrome.

- [ ] **Step 1: Grep for chrome hex**

Run:

```bash
cd /Users/gorkemcetin/atlasmail
```

Then use the Grep tool (not shell grep) with pattern `#6b7280|#9ca3af|#4b5563|#374151|#d1d5db|#e5e7eb|#f3f4f6` across `packages/client/src/apps/` and `packages/client/src/components/`, output_mode `content`, `-n true`.

- [ ] **Step 2: For each hit, decide:**

- In inline `style={{ color: '...' }}`, `border: '... #xxx'`, `background: '#xxx'` in an app chrome context (icon, label, button, separator) → replace with the closest token:
  - `#6b7280` / `#9ca3af` → `var(--color-text-tertiary)`
  - `#4b5563` / `#374151` → `var(--color-text-secondary)`
  - `#d1d5db` / `#e5e7eb` → `var(--color-border-primary)`
  - `#f3f4f6` → `var(--color-bg-secondary)`
- In chart config (`fill`, `stroke`, series arrays), Excalidraw props, canvas ink, color-picker palettes → **leave**
- If in doubt, leave and note in the commit message

- [ ] **Step 3: If any changes were made, smoke-test the affected page**

Visit each app whose chrome you touched. Confirm both modes render sensibly.

- [ ] **Step 4: Commit (one commit even if many files touched)**

```bash
git add packages/client/src/apps packages/client/src/components
git commit -m "refactor(ui): replace chrome hex with theme tokens across apps"
```

If nothing to commit, skip.

---

## Task 11: Segmented-control sweep (conditional)

**Files:** whatever pages define inline segmented groups

Atlas has no shared `Segmented` component — segmented groups are inlined per page (e.g. on dashboards with Day/Week/Month switches, or view mode List/Grid/Board toggles). The refreshed spec requires the active chip to use `--color-accent-subtle` + `--color-accent-primary` so dark mode distinguishes it.

- [ ] **Step 1: Grep for inline segmented patterns**

Use the Grep tool with pattern `segmented|segment-group|view-mode-switch|toggle-group` across `packages/client/src/apps/`, output_mode `files_with_matches`, case-insensitive.

Also search for the common visual pattern: three or four adjacent buttons inside a pill background. Pattern: `borderRadius.*999|borderRadius.*full` combined with `display.*flex` — too broad, so just scan the files from the first grep manually.

- [ ] **Step 2: For each segmented group found, check the active-state styling**

Open the file. If the active chip uses:
- `var(--color-bg-elevated)` / `var(--color-surface-selected)` / `white` / `#ffffff` for background
- Plain shadow for depth

And no accent color for the active pill, change to:
- `background: 'var(--color-accent-subtle)'`
- `color: 'var(--color-accent-primary)'`
- Remove the shadow (or keep if it reads well in both modes)

Only edit files where the active state is actually hardcoded; if the file already uses `--color-accent-*` tokens, skip.

- [ ] **Step 3: Smoke-test segmented groups in dark mode**

Flip to dark. Visit the pages you edited. The active chip should clearly stand out from its inactive siblings — accent-tinted, not a dark-gray on dark-gray mush.

- [ ] **Step 4: Commit (if any changes made)**

```bash
git add packages/client/src/apps
git commit -m "refactor(ui): segmented-control active state uses accent token for dark mode"
```

If no edits were needed, skip the commit.

---

## Task 12: Full-platform walkthrough

**Files:** none (testing only)

- [ ] **Step 1: Build succeeds**

```bash
cd /Users/gorkemcetin/atlasmail/packages/server && npm run build
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build
```

Both must succeed. TypeScript errors are ship-blockers per CLAUDE.md.

- [ ] **Step 2: Format check**

```bash
cd /Users/gorkemcetin/atlasmail/packages/server && npm run format-check
cd /Users/gorkemcetin/atlasmail/packages/client && npm run format-check
```

If either fails, run `npm run format` and commit `style: prettier format after UI refresh`.

- [ ] **Step 3: Manual walkthrough — light mode**

In the running dev server, visit each of these routes and verify the refresh reads cleanly:

1. `/` — Home, app tiles
2. `/crm` — dashboard, then Leads / Contacts / Deals / Activities / Proposals
3. `/hr` — dashboard, employees, leave requests
4. `/projects` — list + board views
5. `/calendar` — month + week views
6. `/sign-app` — document list, a document detail
7. `/invoices` — dashboard, invoice list, recurring
8. `/drive` — file grid, open a CSV preview, open a sheet preview
9. `/tasks` — list + board
10. `/docs` — doc list, open a doc (editor chrome)
11. `/draw` — drawing list, open a drawing (Excalidraw chrome)
12. `/system` — tenants, all users, permissions (admin)
13. Settings panels — About, Appearance, Account, Org members

For each:
- DataTable column headers are 11px uppercase muted
- Primary buttons have subtle accent shadow
- Inputs use lighter tertiary fill
- Focus ring appears on Tab, not on click
- No dull `#5a7fa0` anywhere (links, info icons)

- [ ] **Step 4: Manual walkthrough — dark mode**

Flip the theme. Repeat the same routes. Verify:
- Panels are warm near-black `#17181b`, not blue-black
- Inputs feel slightly inset
- Accent pops (`#8b94ea` lifted indigo)
- Info/warning/error badges legible
- No text contrast failures

- [ ] **Step 5: DevTools check for remaining `#5a7fa0`**

Open DevTools → Sources → search for `5a7fa0` case-insensitive across the client bundle. Expect zero hits in application code (may appear in a user theme if the user ever picked `#5a7fa0` as their custom accent via `lib/color-themes.ts` — that's fine, it's a user preference value).

If any chrome hit surfaces, fix in place and commit `fix(ui): replace leftover #5a7fa0 in <file>`.

- [ ] **Step 6: Commit final if any**

Usually nothing to commit here; this task is verification.

---

## Task 13: Version bump, release (asks user first per CLAUDE.md)

**Files:**
- Modify: `packages/client/src/config/version.ts`
- Modify: `packages/client/package.json`
- Modify: `packages/server/package.json`
- Modify: `packages/shared/package.json`
- Modify: `README.md` (IMAGE_TAG pin example)

- [ ] **Step 1: STOP — ask user for release permission**

Do NOT tag or release without explicit "yes." Per project memory: every release requires fresh explicit permission. Ask:
> "Phase A is implemented and walked through. Ready to bump to `v2.5.0` (minor — UI refresh is a feature) and cut a release? Needs explicit yes."

Wait for the answer. If yes, proceed. If "not yet," stop here.

- [ ] **Step 2: Bump `APP_VERSION`**

Edit `packages/client/src/config/version.ts`:

```ts
export const APP_VERSION = '2.5.0';
```

- [ ] **Step 3: Bump `version` in all three workspace package.json files**

In each of `packages/client/package.json`, `packages/server/package.json`, `packages/shared/package.json`, change `"version": "2.4.0"` → `"version": "2.5.0"`.

- [ ] **Step 4: Bump README IMAGE_TAG example**

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
## UI refresh — Phase A

Linear-inspired token and typography pass across the platform.

### What changed
- Page / panel / input backgrounds warmed up; lighter hairline borders
- Killed dull #5A7FA0 — links, info, unread indicators now use the accent indigo
- DataTable headers: 11px, weight 500, uppercase, muted (was 12px / 620 / heavy)
- Primary buttons get a subtle accent-tinted shadow
- Global 3px accent focus ring on keyboard focus
- Font-weight tokens aligned to standard 500/600/700
- Dark mode: warmer near-black panels, lifted accent, cleaner badge contrast
- Several inline-hex sites converted to tokens

### What didn't change
- Component APIs — nothing to migrate
- Dockbar and per-app brand colors — those change in Phase B
- Non-canonical tables — those convert in Phase C

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

Expected: `in_progress` for `v2.5.0`. Confirm the run URL and report back.

---

## Rollback

If anything goes wrong after ship, `git revert` any of the per-task commits — they're atomic and in order. Token commits are safe to revert in either direction.

---

## Phase C reminder (do not forget)

User explicitly asked to be reminded about converting 11 non-canonical tables to `DataTable` after Phase A ships. The punch-list is at the bottom of `docs/superpowers/specs/2026-04-23-ui-refresh-phase-a-design.md`. Bring it up when A is out the door.
