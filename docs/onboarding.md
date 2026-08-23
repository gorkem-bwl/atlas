# Atlas — Developer onboarding

Get from a clean clone to a running stack, then know where things live and what will bite you.

Verified against the codebase on **2026-08-23** at version **2.10.0**.

---

## 1. What Atlas is

A multi-tenant business platform. One deployment hosts many independent organizations
(tenants), each with its own users, enabled apps, settings, and data.

Ten apps, each self-contained and registered through a manifest: **CRM, HR, Work, Calendar,
Agreements, Invoices, Drive, Write, Draw, System**.

**Stack:** React 19 + TypeScript + Vite (client) · Express 5 + PostgreSQL 16 + Drizzle ORM
(server) · a shared types package. Turborepo drives the three workspaces.

```
packages/
  client/   @atlas-platform/client   React SPA, dev port 5180
  server/   @atlas-platform/server   Express API, port 3001
  shared/   @atlas-platform/shared   types + RBAC matrix, consumed by both
```

In **production there is a single container**: the Express server on port 3001 serves the API
*and* the built client as static files. No nginx. Vite's 5180 is development-only.

---

## 2. Running it locally

### Prerequisites

Node 22 (CI uses 22; the Docker image builds on 20), npm 10.9.4, Docker for Postgres/Redis.

### First run

```bash
git clone <repo> && cd atlas
npm install                              # REQUIRED — a fresh clone has no node_modules,
                                         # and typecheck will fail with bogus "Cannot find
                                         # module 'zod'" errors until you run it

docker compose up -d                     # postgres:16 on 5432, redis:7 on 6379
                                         # NOTE: this compose file has NO atlas service —
                                         # it is databases only. You run the app on the host.

cp .env.example .env                     # then replace the three CHANGE_ME values:
                                         #   openssl rand -hex 32   (x3)

npm run dev                              # turbo: shared build → server 3001 + client 5180
```

Open <http://localhost:5180>. The first run lands on `/setup`, which bootstraps the first
tenant and makes you its owner.

`setup.sh` (macOS/Linux) and `setup.ps1` (Windows) automate the `.env` step and bring the
stack up via `docker-compose.production.yml`.

### Seeding demo data

```bash
./scripts/seed-dev-tenant.sh <jwt>       # JWT from localStorage key `atlasmail_token`
```

It POSTs to each app's `/seed` endpoint. It does **not** seed `/work`. Demo data planted
through Settings is tracked in `demo_data_seeds` so "Remove demo data" deletes only seeded rows.

---

## 3. Verification gates

Run these before committing. There is no `format-check` script.

```bash
npm run typecheck    # turbo → tsc --noEmit in all three packages
npm run lint         # turbo → eslint
npm test             # turbo → vitest (~98 test files)
npm run build        # turbo → shared tsc, client vite build, server tsc

cd packages/server
npm run test:integration   # needs a live Postgres
npm run db:check-drift     # schema.ts vs the live DB — catches missing columns
npm run openapi:build      # fails the build if the OpenAPI spec is malformed
```

**CI** (`.github/workflows/ci.yml`, Node 22, on push/PR to `main`) runs four jobs:
`typecheck`, `server-unit` (+ `openapi:build`), `server-integration` (postgres service
container), `client-unit`. **No e2e job runs in CI.**

**E2E is local-only:**
```bash
npx playwright install chromium
npm run test:e2e          # boots both dev servers itself
```
Some specs are stale — `navigation.spec.ts` and `accessibility.spec.ts` still exercise a
**Tables** page that moved to `legacy/`, and the Tasks cases target `/tasks`, which no longer
exists.

---

## 4. How a feature is wired

Three registries, all driven by side-effect imports. If your new thing does not appear,
you almost certainly skipped a `register(...)` call.

### Apps

```ts
// packages/client/src/apps/index.ts
import { crmManifest } from './crm/manifest';
appRegistry.register(crmManifest);

// packages/server/src/apps/index.ts
import { crmServerManifest } from './crm/manifest';
serverAppRegistry.register(crmServerManifest);
// serverAppRegistry.mountAll(router) is called once from routes/index.ts
```

The client manifest supplies routes, sidebar order, settings panels, widgets, and the
first-run tour. The server manifest supplies an Express router and a `routePrefix`
(defaulting to `/${id}`).

### Settings panels

Nested **inside** the client manifest as `settingsCategory.panels`. No separate registry.

### Query keys

Every app owns a namespace in `packages/client/src/config/query-keys.ts` (25 namespaces).
Never invent an ad-hoc key in a hook — going through `queryKeys.*` is what makes
`invalidateQueries` work from anywhere.

---

## 5. Request lifecycle

```
Component
  └─ React Query hook (apps/<app>/hooks.ts)
      └─ api.get(...)                      lib/api-client.ts — axios, injects Bearer token
          ↓ HTTP  /api/v1/<prefix>/...
Express (app.ts middleware chain)
  helmet → cors → json → health/share/openapi/uploads → audit → rate-limit → routes
      └─ app router (apps/<app>/routes.ts)
          authMiddleware                   verifies JWT → req.auth
          requireAppPermission('<app>')    RBAC gate → req.<app>Perm
          withConcurrencyCheck(table)      optional, on PATCH
              └─ controller.ts             extracts req.auth, shapes the response
                  └─ service.ts            Drizzle query — MUST filter on tenantId
```

**Response envelope:** `{ success: true, data }` / `{ success: false, error }`, plus a `code`
for machine-readable cases (`STALE_RESOURCE`, `INVALID_UUID`, `VALIDATION_ERROR`).

### Auth

```ts
interface AuthPayload {
  userId: string;
  tenantId: string;              // required
  email: string;
  tenantRole?: TenantMemberRole; // owner | admin | member
  isSuperAdmin?: boolean;
  impersonatedBy?: string;
}
```

There is **no `accountId`** on `req.auth`. Access tokens live 1 h, refresh tokens 30 d, and
both carry the same payload. `tenantId` is resolved at login and **the first tenant wins** —
there is no tenant-selection parameter on the login path.

The client refreshes preemptively at 55 min and on 401 (queuing concurrent requests behind one
refresh). A failed refresh does not hard-redirect; it raises `SessionExpiredModal`.

### RBAC

`packages/shared/src/rbac.ts` is the single source of truth, shared with the client:

| Role | Operations |
|---|---|
| `admin` | view, create, update, delete, delete_own |
| `editor` | view, create, update, delete_own |
| `viewer` | view |

Resolution order: super-admin claim → explicit `app_permissions` row → derived from
`tenant_members.role` (owner/admin → admin; **any other member → editor**) → no tenant → admin.

`requireApp(appId)` is a different check — tenant-level app *enablement*, not RBAC.

### Optimistic concurrency

Mandatory for any entity edited by more than one user. Three touch points:

1. Server route: `withConcurrencyCheck(myTable)` before the update controller.
2. Mutation hook: forward `updatedAt` via `ifUnmodifiedSince(updatedAt)`.
3. Detail page: pass `record.updatedAt` on every `.mutate(...)`.

The global `ConflictDialog` in `App.tsx` handles 409s. The middleware is **lenient by
default** — no client version means no check — and fail-open on internal errors.

---

## 6. The database

`packages/server/src/db/schema.ts` — 106 tables, **no `pgEnum`s** (statuses are `varchar`
validated in app code).

### Changing the schema

**There is no `db:push`.** Older docs said otherwise; the script does not exist.

```bash
cd packages/server
# 1. edit src/db/schema.ts
npm run db:generate     # drizzle-kit → new .sql in src/db/migrations/
npm run db:check-drift  # verify schema.ts and the DB agree
# 2. restart the server — bootstrapDatabase() applies it on boot
```

`bootstrapDatabase()` (`src/db/bootstrap.ts`, called from `index.ts`) **replays every
migration on every start**, swallowing duplicate-object errors so replay is safe against both
an empty and a fully-migrated database. Consequences:

- **Migrations must be idempotent.** Use `IF NOT EXISTS`; the benign-error swallow is a safety
  net, not a design.
- Anything drizzle-kit cannot express goes in a dated `.ts` migration plus an import and call
  in `bootstrap.ts` (there are seven today).

### Conventions

Most record tables carry `id` (uuid, `defaultRandom`), `tenantId`, `userId`, `isArchived`,
`sortOrder`, `createdAt`, `updatedAt`. Table names are flat and plural; join tables read
`tenant_members`. Soft-delete via `isArchived` — never hard-delete user data.

> **Tenant scoping is not enforced anywhere.** `config/database.ts` says so explicitly. A
> service query missing `.where(eq(table.tenantId, ...))` leaks data across tenants. There is
> no RLS. This is the highest-risk bug class in the codebase — check it in every review.

---

## 7. Building UI

Read `docs/design-system.md` first. The essentials:

- Use the 38 components in `packages/client/src/components/ui/` — never raw
  `<button>`, `<input>`, `<select>`, `<textarea>`.
- Use CSS variables for every color, space, radius, and font size. No hardcoded hex.
  (`config/role-colors.ts` violates this; do not copy it.)
- `<ContentArea>` is the page template for every app page — it owns the 44px header frame and
  the dock reserve. Only Draw is exempt (full-bleed Excalidraw canvas).
- **Sizes:** `sm`=28px, `md`=34px, `lg`=40px. Data views, toolbars, and table cells are `sm`
  and you must pass it explicitly (the default is `md`). Never mix sizes in one row.
- Confirmations use `<ConfirmDialog>` — never `window.confirm`.
- Settings persist through the server API + React Query, not localStorage.

**Theming** is a `data-theme` attribute on `<html>` written by `ThemeProvider`; there is no
`prefers-color-scheme` query in `theme.css`. System preference is resolved in JS.

**i18n:** 5 locales (en, tr, de, fr, it), currently in perfect sync at **4,535 keys each**.
Every user-visible string uses `t()`, keys are namespaced per app, and all five files must be
updated in the same commit. Only `en.json` is bundled; the rest lazy-load.

---

## 8. Where to look

| You want | Go to |
|---|---|
| Every endpoint | `/api/v1/openapi.json`, or the Scalar UI at `/api/v1/reference` |
| Add an endpoint to the spec | `packages/server/src/openapi/paths/<app>.ts` |
| Tables & columns | `packages/server/src/db/schema.ts` |
| Client routes | `packages/client/src/config/routes.ts` + each app manifest |
| Query keys | `packages/client/src/config/query-keys.ts` |
| Design tokens | `packages/client/src/styles/theme.css` |
| RBAC matrix | `packages/shared/src/rbac.ts` |
| Auth | `packages/server/src/middleware/auth.ts` |
| API client / refresh logic | `packages/client/src/lib/api-client.ts` |
| Background jobs | `packages/server/src/workers/` + per-app `reminder.ts` schedulers |
| Cross-app links | `packages/server/src/services/record-link.service.ts`, `components/shared/SmartButtonBar.tsx` |

`docs/api-reference.md` is **deprecated** and documents `/projects` and `/tasks` route trees
that no longer exist. Use the live OpenAPI spec.

---

## 9. Background work

Two independent layers:

**BullMQ over Redis** (`src/workers/`, queue `atlas-sync`) — Google Calendar and Gmail sync,
Paraşüt sync, message cleanup. `getSyncQueue()` returns **`null` when `REDIS_URL` is unset**,
so everything queue-related silently no-ops without Redis. `WORKER_MODE=api` disables the
worker entirely.

**Plain `setInterval` schedulers** started from `index.ts` and living in app directories —
Agreements reminders, Work task reminders, CRM activity reminders and daily digest, HR leave
balances, recurring invoices, invoice reminders, drawing purge, DB backup. **These need no
Redis** and run in every deployment.

---

## 10. Traps

See the **Gotchas** section in `CLAUDE.md` for the full list. The ones that cost the most time:

1. **`npm install` first.** Without it, typecheck reports missing `zod` — a dependency
   problem, not a code problem.
2. **No `projects`/`tasks` app.** Both merged into `work` on 2026-04-15.
3. **`sign` displays as "Agreements", `docs` as "Write", `draw`'s server prefix is `/drawings`.**
4. **Two `contacts` tables** — `contacts` (Google-synced) vs `crm_contacts` (CRM entity).
5. **Manifest `tables` arrays drift** — nothing validates them. Trust `schema.ts`.
6. **`atlasmail_*` localStorage keys are load-bearing** despite the rename.
7. **Email-era dead code** (7 i18n namespaces, several CSS variables, two skeletons) coexists
   with **live** message-sync tables that power CRM. Don't delete the latter as "old email stuff".

---

## 11. Conventions that are enforced socially, not by tooling

- Never open a PR without explicit permission. Pushing a branch is fine.
- Never tag or create a release without explicit permission.
- Every git tag needs a matching GitHub Release.
- On release, bump `packages/client/src/config/version.ts` (`APP_VERSION`) **and** all three
  `packages/*/package.json` files. `about-panel.tsx` imports the constant and hardcodes nothing.
- Don't import from one app into another — use `record_links` / `SmartButtonBar`.
- Keep apps self-contained; don't create files outside the app directory.
