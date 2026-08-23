# Atlas — Project Documentation

## Overview

Atlas is an all-in-one business platform with modular app architecture. Each app is self-contained in its own directory and registers via manifests.

**Stack:** React + TypeScript + Vite (client), Express + PostgreSQL + Drizzle ORM (server), shared types package.

**Product name:** Atlas (NOT AtlasMail). No email functionality exists.

---

## Documentation Index

Detailed documentation lives in `/docs/`. Read the relevant doc before building or modifying a feature.

| Document | What it covers | When to read |
|----------|---------------|--------------|
| **Live OpenAPI spec:** `/api/v1/openapi.json` + Scalar UI at `/api/v1/reference` (generated from `packages/server/src/openapi/paths/`). The old `docs/api-reference.md` is deprecated. | Every API endpoint — method, path, auth, request/response shapes | Building client hooks, testing endpoints, debugging API calls |
| [Database Schema](docs/database-schema.md) | All tables, columns, types, constraints, FK relationships, indexes | Adding tables, writing migrations, building queries |
| [Developer onboarding](docs/onboarding.md) | Clone → running stack, verification gates, request lifecycle, registries, traps | **Start here** on day one, or when returning to an unfamiliar area |
| [App Architecture](docs/app-architecture.md) | App registry pattern, per-app features/routes/tables, adding new apps | Building a new app, understanding how apps register |
| [Design System](docs/design-system.md) | CSS variables, component library (38 components in `components/ui/`), layout patterns, i18n | Building UI, creating components, styling, translations |
| [Infrastructure](docs/infrastructure.md) | Docker, deployment, CI/CD, CLI, env vars, SSL, backups, monitoring | Deploying, configuring, troubleshooting production |
| [Field-service gap analysis](docs/field-service-gap-analysis.md) | Verified customer feedback (Housecall Pro): contact addresses, job entity, cross-app fragmentation | Working on CRM/Invoices data model or customer-360 UI |
| [Architecture for agents](docs/architecture-for-agents.md) | Registry patterns, data flow, auth layers, UI primitives lookup, debugging recipes, hard rules | Onboarding to the codebase; before touching a new area |

---

## Monorepo Structure

```
packages/
  client/     — React frontend (port 5180)
  server/     — Express API (port 3001)
  shared/     — Shared TypeScript types
```

---

## App Architecture

Every app follows the same self-contained structure:

### Client (`packages/client/src/apps/{name}/`)
```
manifest.ts          — App metadata, routes, settings panels, sidebar config
page.tsx             — Main page component
components/          — App-specific components
hooks.ts             — Data fetching hooks (React Query)
settings-store.ts    — App settings (Zustand + server persistence)
```

### Server (`packages/server/src/apps/{name}/`)
```
manifest.ts          — App metadata, Express router, table list
routes.ts            — Express route definitions
controller.ts        — Request handlers
service.ts           — Business logic + database queries
```

### Current Apps

Source of truth: `packages/client/src/apps/index.ts` and `packages/server/src/apps/index.ts`.
Every value below is read from the app's own `manifest.ts`.

| App | ID | Display name | Color | Icon (lucide) | Sidebar order | Client route(s) | Server prefix |
|-----|----|--------------|-------|---------------|---------------|-----------------|---------------|
| CRM | `crm` | CRM | `#f97316` | `Users` | 10 | `/crm` | `/crm` |
| HR | `hr` | HR | `#10b981` | `UserCog` | 20 | `/hr` | `/hr` |
| Work | `work` | Work | `#6366f1` | `FolderKanban` | 25 | `/work` | `/work` |
| Calendar | `calendar` | Calendar | `#f97316` | `CalendarIcon` | 27 | `/calendar` | *(client-only)* |
| Agreements | `sign` | Agreements | `#8b5cf6` | `FileSignature` | 30 | `/sign-app`, `/sign-app/:id` | `/sign` |
| Invoices | `invoices` | Invoices | `#0ea5e9` | `Receipt` | 35 | `/invoices` | `/invoices` |
| Drive | `drive` | Drive | `#64748b` | `HardDrive` | 40 | `/drive`, `/drive/folder/:id` | `/drive` |
| Write | `docs` | Write | `#c4856c` | `FileText` | 70 | `/docs`, `/docs/:id` | `/docs` |
| Draw | `draw` | Draw | `#e06c9f` | `PenTool` | 80 | `/draw`, `/draw/:id` | **`/drawings`** |
| System | `system` | System | `#6b7280` | `Settings2` | 90 | `/system` | `/system` |

**Three names differ from their app ID — this trips people up constantly:**

- `sign` renders as **"Agreements"** in the UI. The client route is `/sign-app`, the server prefix is `/sign`, the directory is `apps/sign`.
- `docs` renders as **"Write"**. Do not confuse `apps/docs` (the app) with `/docs` (this repo's documentation folder).
- `work` renders as **"Work"** and is the *merger of the former Projects and Tasks apps*.
- `draw`'s server prefix is **`/drawings`**, not `/draw` — the only app whose prefix differs from its id.

> **The Work app.** There is no `projects` app and no `tasks` app. They were retired in
> `fbfdb5f0 refactor(work): retire tasks and projects apps` and merged into a single `work`
> app that owns projects, tasks, time tracking, and reporting. Its tables are still named
> `tasks`, `task_*`, `project_*` — the *tables* kept their names, the *apps* did not.
> The DB side of that merge lives in `packages/server/src/db/migrations/2026-04-15-work-merge.ts`.
> If you see `/projects`, `/tasks`, `apps/projects`, or `apps/tasks` anywhere, it is stale.

> **Icons.** Every app uses a plain [lucide](https://lucide.dev) icon, set as `icon:` in its
> manifest. The old hand-authored multicolor brand SVG system
> (`components/icons/app-icons.tsx`, `BRAND_ICON_BACKGROUNDS`, `FULL_BLEED_BRAND_ICONS`)
> **no longer exists** — do not look for it.

> **Calendar is client-only.** There is no `packages/server/src/apps/calendar/`; it is not in
> the server registry. Its data comes from `services/calendar*.service.ts` plus the Google
> sync worker, exposed via `routes/`, not via an app manifest.

---

## Adding a New App

### 1. Shared types
Create `packages/shared/src/types/{name}.ts` with interfaces.
Add `export * from './{name}'` to `packages/shared/src/types/index.ts`.

### 2. Database
Add tables to `packages/server/src/db/schema.ts`.
Generate a migration: `cd packages/server && npm run db:generate`, then restart the server
(`bootstrapDatabase()` applies it on boot). See **Migrations** below — there is no `db:push`.

### 3. Server app
Create directory `packages/server/src/apps/{name}/` with:
- `service.ts` — CRUD functions (import db, schema, drizzle-orm)
- `controller.ts` — Express handlers (extract auth from `req.auth!`)
- `routes.ts` — Express router (import authMiddleware)
- `manifest.ts` — ServerAppManifest

Register in `packages/server/src/apps/index.ts`:
```typescript
import { myServerManifest } from './{name}/manifest';
serverAppRegistry.register(myServerManifest);
```

### 4. Client app
Create directory `packages/client/src/apps/{name}/` with:
- `hooks.ts` — React Query hooks
- `page.tsx` — Page component using AppSidebar
- `components/` — App-specific components
- `settings-store.ts` — Settings
- `manifest.ts` — ClientAppManifest

Register in `packages/client/src/apps/index.ts`:
```typescript
import { myManifest } from './{name}/manifest';
appRegistry.register(myManifest);
```

### 5. Global search (optional)
Add to `packages/server/src/services/global-search.service.ts` UNION ALL query.

### 6. Query keys
Add namespace to `packages/client/src/config/query-keys.ts`.

That's it — sidebar, routes, settings panels register automatically from the manifest.

---

## Database Patterns

### Common columns (every record table)
```typescript
id: uuid('id').primaryKey().defaultRandom(),
accountId: uuid('account_id').notNull(),
userId: uuid('user_id').notNull(),
isArchived: boolean('is_archived').notNull().default(false),
sortOrder: integer('sort_order').notNull().default(0),
createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
```

### Table naming
- Flat names, plural: `documents`, `tasks`, `drive_items`
- Join tables: `tenant_members`, `tenant_apps`
- No app prefix needed

### Schema file
All tables in `packages/server/src/db/schema.ts`. Sections:
- Users & Accounts (users, accounts, userSettings, passwordResetTokens)
- Platform (tenants, tenantMembers, tenantInvitations, tenantApps)
- Custom Fields (customFieldDefinitions)
- Record Links (recordLinks)
- App tables (documents, drawings, tasks, driveItems, etc.)

### Migrations
**There is no `db:push` script.** It was removed. Do not run it, and do not add it back
without discussion — earlier revisions of this file documented it and the instruction was
dead for months.

Atlas now uses **versioned migrations that replay automatically on every server start.**

`schema.ts` is still the source of truth for *types and queries*, but the live database is
built by `bootstrapDatabase()` (`packages/server/src/db/bootstrap.ts`), called once from
`packages/server/src/index.ts` inside the `app.listen` callback. It:

1. Reads every `.sql` file in `src/db/migrations/`, sorted by filename, splits on
   `--> statement-breakpoint`, and executes each statement.
2. **Swallows benign errors** — duplicate table/column/object/index, unique violations on
   seed inserts (`BENIGN_MIGRATION_ERRORS`). This is what makes replay-on-every-boot safe
   against both an empty database and a fully-migrated one.
3. Runs the hand-written **TypeScript** migrations in order, each an exported function:
   `2026-04-15-work-merge`, `2026-04-22-crm-workflow-steps`, `2026-04-28-message-channels`,
   `2026-04-29-gmail-message-partial-index`, `2026-05-20-task-time-tracking`,
   `2026-05-22-parasut-connections`, `2026-05-22-task-schedule-times`.

**To change the schema:**

```bash
cd packages/server
# 1. edit src/db/schema.ts
npm run db:generate      # drizzle-kit generate → new .sql in src/db/migrations/
npm run db:check-drift   # verify schema.ts and the migrations agree
# 2. restart the server — bootstrapDatabase() applies it
```

A data backfill or anything drizzle-kit can't express goes in a new dated `.ts` migration
plus an import + call in `bootstrap.ts`. `npm run db:migrate` and `npm run db:studio` exist
for direct drizzle-kit use.

> Because migrations replay on every boot, a migration must be **idempotent**. Use
> `ADD COLUMN IF NOT EXISTS` / `CREATE ... IF NOT EXISTS` rather than relying on the
> benign-error swallow, which is a safety net and not a design.

---

## Authentication

### JWT structure (`req.auth`)
```typescript
interface AuthPayload {
  userId: string;
  tenantId: string;              // REQUIRED, not optional
  email: string;
  tenantRole?: TenantMemberRole; // 'owner' | 'admin' | 'member'
  isSuperAdmin?: boolean;
  impersonatedBy?: string;       // set only by admin impersonation
}
```

### Middleware
- `authMiddleware` — JWT verification, sets `req.auth`
- `adminAuthMiddleware` — Requires `isSuperAdmin: true`
- `requireApp(appId)` — Checks tenant has app enabled

### Secrets (env vars)
- `JWT_SECRET` — Access token signing (1h expiry)
- `JWT_REFRESH_SECRET` — Refresh token signing (30d expiry)
- `TOKEN_ENCRYPTION_KEY` — 64-char hex for AES-256 encryption

---

## UI Components

All in `packages/client/src/components/ui/`. **Always use these instead of raw HTML elements.**

### Form elements
| Component | Props | Use for |
|-----------|-------|---------|
| `Button` | variant: primary/secondary/ghost/danger, size: sm/md/lg | All buttons |
| `Input` | label?, error?, size: sm/md/lg, iconLeft? | Text inputs |
| `Textarea` | label?, error? | Multi-line text |
| `Select` | value, onChange, options, size?, width? | Dropdowns |
| `IconButton` | icon, label, size, tooltip?, destructive? | Icon-only buttons |

### Size alignment
Input and Button sizes match: sm=28px, md=34px, lg=40px. **Always use the same size when placing them side-by-side.**

**Size rule:**
- **Data views, list toolbars, inline edit rows, and table cells** → use `size="sm"` (28px) for every Input / Select / Button. Density matters in tables.
- **Auth pages, first-run setup, full-page forms, and large modals with lots of breathing room** → use `size="md"` (34px).
- The component library defaults Input/Select/Button to `md`. In a data view you **must** pass `size="sm"` explicitly on every form control you add, otherwise it will misalign against neighbouring sm buttons.
- Never mix sizes in the same row. If any control in a row is `sm`, the whole row is `sm`.

### Feedback
| Component | Use for |
|-----------|---------|
| `Badge` | Status labels (variant: default/primary/success/warning/error) |
| `Chip` | Removable tags with color |
| `Skeleton` | Loading placeholders |
| `Toast` | Notifications (via useToastStore) |
| `Tooltip` | Hover help text |

### Layout
| Component | Use for |
|-----------|---------|
| `Modal` | Dialogs (compound: Modal, Modal.Header, Modal.Body, Modal.Footer) |
| `Popover` | Radix popover (Popover, PopoverTrigger, PopoverContent) |
| `ContextMenu` | Right-click menus |
| `ConfirmDialog` | Destructive action confirmation |
| `ScrollArea` | Custom scrollbars |
| `AppSidebar` | App sidebar shell (resizable, persistent width) |
| `SidebarItem` | Nav items inside AppSidebar |
| `SidebarSection` | Grouped sections inside AppSidebar |
| `SmartButtonBar` | Cross-app link badges (appId + recordId) |

### Other
| Component | Use for |
|-----------|---------|
| `Avatar` | User profile pictures with fallback |
| `Kbd` | Keyboard shortcut display |
| `EmptyState` | Full-page empty states |

---

## Design Tokens (CSS Variables)

### Colors
```css
--color-bg-primary          /* Main background (white/dark) */
--color-bg-secondary        /* Secondary background */
--color-bg-tertiary         /* Tertiary/input background */
--color-bg-elevated         /* Elevated surfaces (modals) */
--color-text-primary        /* Primary text */
--color-text-secondary      /* Secondary text */
--color-text-tertiary       /* Muted text */
--color-border-primary      /* Primary borders */
--color-border-secondary    /* Subtle borders */
--color-accent-primary      /* Brand accent (#13715B) */
--color-surface-hover       /* Hover state */
--color-surface-selected    /* Selected/active state */
--color-success             /* Success green */
--color-warning             /* Warning amber */
--color-error               /* Error red */
```

### Spacing
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 20px
--spacing-2xl: 24px
```

### Typography
```css
--font-family               /* System font stack */
--font-size-xs: 11px
--font-size-sm: 13px
--font-size-md: 14px
--font-size-lg: 16px
--font-size-xl: 18px
--font-size-2xl: 24px
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

### Border radius
```css
--radius-sm: 4px
--radius-md: 6px
--radius-lg: 8px
--radius-xl: 12px
```

### Shadows
```css
--shadow-sm
--shadow-md
--shadow-lg
--shadow-elevated
```

---

## Coding Rules

## Translation / i18n

Atlas uses `react-i18next` for internationalization. 5 languages: EN, TR, DE, FR, IT.

### Translation files
`packages/client/src/i18n/locales/{en,tr,de,fr,it}.json`

### Adding translations for a new app
1. Add a new section to ALL 5 locale files: `"appName": { "key": "value" }`
2. Import `useTranslation` in components: `import { useTranslation } from 'react-i18next'`
3. Use `const { t } = useTranslation()` in each component
4. Replace hardcoded strings with `t('appName.key')`
5. For interpolation: `t('key', { count: 5 })` → `"{{count}} items"`

### Rules
- Every git tag MUST have a corresponding GitHub Release with release notes. They must always be in sync.
- When tagging and making a release, always update the version number in Settings > About Atlas (next to "Current application version").
- NEVER tag or create a release without explicit user permission. Always ask before tagging.

### Release Workflow
When the user asks to "create a release", "make a new version", "tag and release", or similar:
1. **Decide version number**: increment minor (x.Y.0) for features/refactors, patch (x.y.Z) for bugfixes only. Ask if unsure.
2. **Update the version**: `packages/client/src/config/version.ts` (`APP_VERSION`) — this is the single
   source of truth; `about-panel.tsx` imports it and hardcodes nothing. Also bump `version` in all three
   `packages/*/package.json` files (the root package.json has no version field).
3. **Update README.md**: update version pin example if it references a specific version
4. **Commit**: `chore: bump version to X.Y.Z`
5. **Tag**: `git tag vX.Y.Z`
6. **Push**: `git push origin main && git push origin vX.Y.Z`
7. **Create GitHub Release**: `gh release create vX.Y.Z` with detailed release notes
8. **Docker images**: the tag push automatically triggers `.github/workflows/docker.yml` which builds amd64 + arm64 images and pushes to `ghcr.io/gorkem-bwl/atlas`
9. **Verify**: confirm the Docker workflow started and report the run URL
- Every user-visible string MUST use `t()` — no hardcoded English text
- Sidebar labels, view titles, button labels, form labels, empty states, error messages
- Keys are namespaced by app: `crm.sidebar.dashboard`, `sign.actions.upload`
- Add keys to ALL 5 locale files in the same commit
- **Every feature with a UI MUST include translations for all 5 languages (EN, TR, DE, FR, IT).** Do not merge or consider a feature complete if any locale file is missing the new keys. Add translations as part of the feature implementation, not as a follow-up task.

---

### Never do
- Use hardcoded hex colors — use CSS variables
- Use raw `<button>`, `<input>`, `<select>`, `<textarea>` — use shared components
- Use localStorage for settings — use server API + React Query
- Create files outside the app directory — keep apps self-contained
- Import from one app into another — use cross-app linking (record_links) instead
- Use `window.confirm()` or `window.alert()` — always use the `<ConfirmDialog>` component from `components/ui/confirm-dialog.tsx` for destructive action confirmations. It provides a proper modal with title, description, and styled confirm/cancel buttons.

### Always do
- Use `req.auth!.userId` and `req.auth!.tenantId` for data scoping. **`req.auth.accountId` does not exist** — it is not on `AuthPayload` and appears nowhere in the server. Tenant scoping is never enforced by the framework: a query missing `.where(eq(table.tenantId, ...))` leaks across tenants.
- Add `isArchived` for soft deletes (never hard delete user data)
- Use `uuid` primary keys with `defaultRandom()`
- Use CSS variables for all colors, spacing, radius, font sizes
- Use `Button`/`Input` size prop to match heights when side-by-side
- Edit `schema.ts`, then `npm run db:generate` from `packages/server` (never `db:push` — it does not exist)
- Register new apps in both client and server `apps/index.ts`
- Use `<ContentArea>` (`packages/client/src/components/ui/content-area.tsx`) as the right-side page template for every app page. It owns the 44px header frame and the dock-bottom reserve. Apps with custom toolbars pass them via the `headerSlot` prop. Only Draw is exempt (full-bleed Excalidraw canvas).

### Server pattern
```typescript
// Service function — ALWAYS scope on tenantId.
export async function listItems(tenantId: string) {
  return db.select().from(items)
    .where(and(eq(items.tenantId, tenantId), eq(items.isArchived, false)))
    .orderBy(items.sortOrder);
}

// Controller handler
export async function listItems(req: Request, res: Response) {
  try {
    const data = await itemService.listItems(req.auth!.tenantId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to list items');
    res.status(500).json({ success: false, error: 'Failed to list items' });
  }
}
```

### Client hook pattern
```typescript
export function useItemList() {
  return useQuery({
    queryKey: queryKeys.myApp.list,
    queryFn: async () => {
      const { data } = await api.get('/myapp');
      return data.data as MyItem[];
    },
    staleTime: 10_000,
  });
}
```

### Optimistic concurrency (mandatory for every new entity)

Every record edited by more than one user needs Level 2 optimistic concurrency. See `packages/server/src/middleware/concurrency-check.ts` and `packages/shared/src/types/concurrency.ts`. Three hooks to wire for a new entity:

1. **Server route** — add `withConcurrencyCheck(myTable)` before the update controller:
   ```ts
   router.patch('/items/:id', requireAppPermission('myApp'), withConcurrencyCheck(items), controller.updateItem);
   ```
2. **Update mutation hook** — accept optional `updatedAt` and forward via `ifUnmodifiedSince()`:
   ```ts
   mutationFn: async ({ id, updatedAt, ...input }: { id: string; updatedAt?: string } & Partial<T>) => {
     const { data } = await api.patch(`/items/${id}`, input, ifUnmodifiedSince(updatedAt));
     return data.data as Item;
   }
   ```
3. **Detail page** — pass `record.updatedAt` on every `.mutate(...)`:
   ```ts
   updateItem.mutate({ id: item.id, updatedAt: item.updatedAt, name: newName });
   ```

The global `ConflictDialog` (mounted in `App.tsx`) handles 409 STALE_RESOURCE responses automatically — no per-page error handling needed. Tables must already have `id`, `tenantId`, and `updatedAt` columns.

### Client page pattern
```tsx
export function MyAppPage() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <AppSidebar storageKey="atlas_myapp_sidebar" title="My App">
        <SidebarSection>
          <SidebarItem label="All items" icon={<List size={15} />} isActive />
        </SidebarSection>
      </AppSidebar>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Main content */}
      </div>
    </div>
  );
}
```

---

## Key File Paths

| Purpose | Path |
|---------|------|
| Client app registry | `packages/client/src/apps/index.ts` |
| Server app registry | `packages/server/src/apps/index.ts` |
| Route constants | `packages/client/src/config/routes.ts` |
| Query keys | `packages/client/src/config/query-keys.ts` |
| Settings registry | `packages/client/src/config/settings-registry.ts` |
| DB schema | `packages/server/src/db/schema.ts` |
| DB migrations | `cd packages/server && npm run db:generate` (applied on server boot) |
| DB bootstrap/replay | `packages/server/src/db/bootstrap.ts` |
| Auth middleware | `packages/server/src/middleware/auth.ts` |
| Theme/tokens | `packages/client/src/styles/theme.css` |
| Shared types | `packages/shared/src/types/index.ts` |
| Global search | `packages/server/src/services/global-search.service.ts` |
| App sidebar | `packages/client/src/components/layout/app-sidebar.tsx` |
| Smart buttons | `packages/client/src/components/shared/SmartButtonBar.tsx` |

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atlas
JWT_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>
TOKEN_ENCRYPTION_KEY=<64 hex chars>

# Optional
PORT=3001
SERVER_PUBLIC_URL=http://localhost:3001
CLIENT_PUBLIC_URL=http://localhost:5180
CORS_ORIGINS=http://localhost:5180
REDIS_URL=redis://localhost:6379
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
```

---

## Gotchas — read before you debug

Traps that have repeatedly cost time. Each one is verified against the code.

### Naming that does not match

| You'd expect | Reality |
|---|---|
| `apps/projects`, `apps/tasks` | Gone. One `apps/work`. |
| `sign` → "Sign" | Displays as **"Agreements"**. Route `/sign-app`, prefix `/sign`. |
| `docs` → docs | Displays as **"Write"**. `apps/docs` ≠ the `/docs` folder. |
| `draw` prefix `/draw` | Server prefix is **`/drawings`**. |
| `req.auth.accountId` | **Does not exist.** Use `tenantId`. |
| `npm run db:push` | **Does not exist.** Use `db:generate`. |
| `components/icons/app-icons.tsx` | **Does not exist.** Plain lucide icons. |

### Two `contacts` tables

`contacts` is the **Google-synced personal** contact table (`accountId`, `googleResourceName`).
`crm_contacts` is the **CRM entity** (`tenantId`, `companyId`). They are unrelated. Almost
every CRM task means `crm_contacts`.

### Manifest `tables` lists are partly wrong

`ServerAppManifest.tables` is documentation, not wiring — nothing validates it, so it drifts:
- `drive` declares `drive_versions`; the real table is `drive_item_versions`.
- `work` declares `task_projects`, which no longer exists (superseded by `project_projects`).
- The invoices **server** manifest color is `#f59e0b`; the **client** manifest says `#0ea5e9`.

Trust `schema.ts`, never the manifest list.

### There are no `pgEnum`s

All 106 tables use `varchar`/`text` for status/type/role with app-layer validation. Do not
look for a Postgres enum to extend — add the value where it is validated in code.

### Migrations replay on every boot

`bootstrapDatabase()` re-runs every `.sql` migration on each start and swallows
duplicate-object errors. Migrations **must be idempotent**. Never assume a migration runs once.

### Tenant scoping is not enforced

`config/database.ts` says it outright: a query missing `.where(eq(table.tenantId, ...))`
leaks across tenants. There is no RLS and no framework guard. This is the single highest-risk
class of bug in the codebase.

### Email-era dead surface

Atlas was once AtlasMail. Still present and *not* to be treated as live features:
- localStorage keys are all `atlasmail_*` (`atlasmail_token`, …). Don't "fix" them casually — the API client depends on them.
- 7 i18n namespaces (`inbox`, `compose`, `email`, `labels`, `snooze`, `tracking`, `bulk`) ≈144 dead keys × 5 locales.
- `EmailListSkeleton`, `ReadingPaneSkeleton`, `send-animation.tsx`, `--color-unread-indicator`, `--color-star`, `--color-category-*`, and all 6 `--email-*` density variables.

**But note:** `messages`, `message_threads`, `message_channels` and the Gmail sync services are
**live** — they power CRM contact-communication, not a mail client. CLAUDE.md's "no email
functionality" means there is no inbox app; it does not mean these tables are dead.

### Verification gates

```bash
npm install            # required first — a fresh clone has no node_modules
npm run typecheck      # turbo, all three packages
npm run lint
npm test               # vitest, ~98 test files
cd packages/server && npm run db:check-drift   # schema.ts vs live DB
```

CI (`.github/workflows/ci.yml`, **Node 22**) runs four jobs: typecheck, server-unit
(plus `openapi:build`), server-integration (postgres service), client-unit. **There is no e2e
job in CI** — `npm run test:e2e` is local-only and some specs still target the removed
`/tasks` and Tables pages.

---

## Multi-tenancy

Atlas is genuinely multi-tenant. A single deployment can host any number of independent tenants — each with its own users, apps, settings, and data — and we run it that way in production at [app.dodoapps.net](https://app.dodoapps.net) as an open SaaS. A self-hosted private deployment with one company is also valid; the data model is the same in both modes.

- `tenants` — one row per organization. Every domain table carries a `tenant_id` and queries scope on it.
- `tenantMembers` — maps users to a tenant with a role (owner/admin/member). A user can be a member of many tenants.
- `tenantApps` — which apps are enabled per tenant.
- The first user on a fresh deployment is bootstrapped via `POST /auth/setup` — they create the first tenant and become its owner.
- Subsequent tenants can be created via:
  - `POST /auth/register` — open self-service signup. **Disabled by default** (`DISABLE_PUBLIC_SIGNUP=true`); SaaS operators set `DISABLE_PUBLIC_SIGNUP=false` to allow anyone to create a workspace.
  - Tenant invitations — an existing owner adds members via the org-members page.
- Tenant scoping is enforced at the service layer via `req.auth!.tenantId`. There is no shared cross-tenant data; even global features (search, calendar aggregator) filter by `tenantId`.
