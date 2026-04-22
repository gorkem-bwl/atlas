# Atlas — Architecture reference for agents

A map to get productive in Atlas quickly. Read this before spelunking.
Conventions, wiring diagrams, and "where do I look for X?" tables.

CLAUDE.md is the high-level reference; this doc is the concrete, how-does-it-actually-work companion. When the two disagree, CLAUDE.md wins (user-authored) and this doc should be updated.

---

## The three registry patterns

Atlas relies on three side-effect imports to wire features in. If you add a new X and it doesn't show up, you probably forgot to register it.

### 1. Apps (`appRegistry` / `serverAppRegistry`)

Every app self-registers by importing its manifest in the registry barrel.

**Client:** `packages/client/src/apps/index.ts`
```typescript
import { crmManifest } from './crm/manifest';
appRegistry.register(crmManifest);
```

**Server:** `packages/server/src/apps/index.ts`
```typescript
import { crmServerManifest } from './crm/manifest';
serverAppRegistry.register(crmServerManifest);
serverAppRegistry.mountAll(router);  // called once from routes/index.ts
```

A missing `register(...)` call = the app exists in the codebase but is invisible in the sidebar / has no routes.

### 2. Settings panels

Settings panels are nested **inside** the client manifest (`settingsCategory.panels`). They render automatically when the user opens Settings → [app name]. No separate registry.

See `packages/client/src/apps/crm/manifest.ts` for the canonical example.

### 3. Query keys

React Query cache keys live in `packages/client/src/config/query-keys.ts`. **Every app gets a namespace.** Never invent ad-hoc keys in hooks — always go through `queryKeys.myApp.list` etc. This is what makes `queryClient.invalidateQueries({ queryKey: queryKeys.myApp.list })` work from any mutation.

---

## Data flow: one call end-to-end

Tracing `GET /crm/companies/list` from user click to rendered row:

```
User clicks "Companies"
  ↓
CrmPage (apps/crm/page.tsx)
  ↓
useCompanies() hook              ← apps/crm/hooks.ts
  ↓
api.get('/crm/companies/list')   ← lib/api-client.ts (axios, adds auth header)
  ↓  HTTP
Express router                    ← apps/crm/routes.ts
  ↓
authMiddleware                    ← middleware/auth.ts (verifies JWT → req.auth)
  ↓
requireAppPermission('crm')       ← middleware/require-app-permission.ts
  ↓
crmController.listCompanies       ← apps/crm/controller.ts (thin: extract req.auth, call service)
  ↓
crmService.listCompanies          ← apps/crm/service.ts (business logic + Drizzle queries)
  ↓
db.select().from(crmCompanies)    ← config/database.ts + db/schema.ts
  ↓
Postgres
```

Rule of thumb: **controllers are thin, services own logic, hooks never talk to DB-layer types**. Hooks define their own `CrmCompany` interface that matches the *wire shape*, not the Drizzle row shape (they differ — e.g. `contactCount` is a join-computed field).

---

## Authentication & authorization layers

Four layers, in order of precedence:

| Layer | Enforced by | Scope |
|---|---|---|
| JWT signature | `authMiddleware` (all `/api/v1` except a few public routes) | "is this a real session?" |
| Tenant isolation | Services query `.where(eq(table.tenantId, req.auth.tenantId))` | "can this user see this tenant's data?" |
| App permission | `requireAppPermission('crm')` | "is this app enabled for the tenant, and does the user have access?" |
| Super-admin | `adminAuthMiddleware` (on `/admin/*`) | "cross-tenant platform operations" |

`req.auth` shape (from `middleware/auth.ts`):
```typescript
{ userId, tenantId, email, tenantRole?, isSuperAdmin?, impersonatedBy? }
```

**Common mistake:** forgetting the tenant-scope `.where()` on a new service function. Every multi-tenant table MUST filter by `tenantId`. There is no framework-level enforcement — it's manual. Search existing service files for `tenantId` before writing a new query; copy the pattern verbatim.

---

## Optimistic concurrency (mandatory for new entities)

Any record edited by >1 user needs Level 2 concurrency. The pattern is well-documented in CLAUDE.md — the quick version:

1. Table has `updatedAt`.
2. Server route: `router.patch('/items/:id', withConcurrencyCheck(items), controller.update)`.
3. Client mutation: forwards `ifUnmodifiedSince(updatedAt)` header.
4. 409 STALE_RESOURCE is handled globally by `<ConflictDialog>` mounted in App.tsx — no per-page error handling.

Skipping this = silent last-write-wins bugs.

---

## UI primitives: what to use when

**Never reach for raw HTML when a component exists.** Lookup table:

| Need | Use | Not |
|---|---|---|
| Any button | `<Button>` or `<IconButton>` | `<button>` |
| Text input | `<Input>` (has `label`, `error`, `iconLeft` props) | `<input>` |
| Multi-line | `<Textarea>` | `<textarea>` |
| Dropdown | `<Select>` | `<select>` |
| Status label | `<Badge>` | colored `<span>` |
| Removable tag | `<Chip>` | |
| Modal dialog | `<Modal>` (compound: Modal, Modal.Header, Modal.Body, Modal.Footer) | Radix Dialog directly |
| Hover menu | `<Popover>` + `<PopoverTrigger>` + `<PopoverContent>` | Radix Popover directly |
| Right-click menu | `<ContextMenu>` | |
| Destructive confirm | `<ConfirmDialog>` | `window.confirm()` |
| Loading skeleton | `<Skeleton>` | custom CSS shimmer |
| Toast | `useToastStore()` | alert() or snackbar libs |
| Full-page empty state | `<EmptyState>` | |
| Sidebar | `<AppSidebar>` + `<SidebarSection>` + `<SidebarItem>` | custom nav |
| Page frame | `<ContentArea title=… headerSlot=…>` | custom 44px header |

**Size coupling.** Inputs/Selects/Buttons have matching `size` props (sm=28px, md=34px, lg=40px). Never mix sizes in the same row. Data views / table toolbars = `sm`. Auth pages / full-page forms = `md`.

---

## Where do I look for X?

Question → Start here:

| Question | File |
|---|---|
| "How do routes mount?" | `packages/server/src/app.ts` (middleware order + `/api/v1` prefix) |
| "What's the auth header shape?" | `packages/server/src/middleware/auth.ts::AuthPayload` |
| "What tables exist?" | `packages/server/src/db/schema.ts` (grep for `pgTable`) |
| "How do I add a DB column?" | Edit `schema.ts` → add an `addColumnIfMissing` call in `db/bootstrap.ts` |
| "How are settings persisted?" | `packages/server/src/routes/settings.routes.ts` + `user_settings` table |
| "What does /auth/me return?" | `packages/server/src/controllers/auth/login.controller.ts::getMe` |
| "Where's the OpenAPI spec generated?" | `packages/server/src/openapi/registry.ts` (imports all `paths/*.ts`) |
| "Where's the Scalar docs UI mounted?" | `packages/server/src/openapi/routes.ts` → `/api/v1/reference` |
| "How does a route become documented?" | `register({ ... })` in `openapi/paths/<app>.ts` (matches the real route) |
| "How do I validate a request body?" | `defineRoute({..., body: z.object({...})})` exports a `.validate` middleware; put it before the controller |
| "Client store layout?" | `packages/client/src/stores/*.ts` (all Zustand) |
| "How does the JWT get persisted?" | `packages/client/src/stores/auth-store.ts` (localStorage keys in a token map) |
| "What colors / spacing / radius can I use?" | `packages/client/src/styles/theme.css` (CSS variables) |
| "How do translations work?" | `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json` + `useTranslation()` |
| "Where's the app sidebar defined?" | `packages/client/src/components/layout/app-sidebar.tsx` |
| "How do I make a Home page widget?" | `manifest.widgets: [{ component: MyWidget }]` in the client manifest |
| "How does concurrency work?" | `packages/server/src/middleware/concurrency-check.ts` |

---

## Adding a new app — quickstart

Don't copy-paste another app blindly; follow in order:

1. **Shared types.** `packages/shared/src/types/myapp.ts`; re-export from `types/index.ts`.
2. **DB.** Append tables to `packages/server/src/db/schema.ts`. Follow the "common columns" contract (`id`, `tenantId`, `userId`, `isArchived`, `sortOrder`, `createdAt`, `updatedAt`). Add an `addColumnIfMissing` call in `db/bootstrap.ts` for each column so fresh installs get them without migration files.
3. **Server app.** `packages/server/src/apps/myapp/`: `service.ts` (queries) → `controller.ts` (thin handlers) → `routes.ts` (Express) → `manifest.ts`. Register in `apps/index.ts`.
4. **OpenAPI.** `packages/server/src/openapi/paths/myapp.ts`: one `register({...})` per route, or `defineRoute({...})` for routes you want runtime-validated. Add the import in `registry.ts` and the tag in the `tags:` array.
5. **Client app.** `packages/client/src/apps/myapp/`: `manifest.ts` → `hooks.ts` (React Query) → `page.tsx` → `settings-store.ts` (optional). Register in `apps/index.ts`.
6. **Query-key namespace.** Add `myApp: { list: [...], byId: (id) => [...] }` to `config/query-keys.ts`.
7. **Global search (optional).** Add a SELECT to the UNION in `packages/server/src/services/global-search.service.ts`.
8. **i18n.** Add `myApp: {...}` to ALL five locale files — not just English.

Sidebar, routes, settings panels register automatically from the manifest.

---

## Hard rules (do-not-do list)

Pulled from MEMORY.md and CLAUDE.md. Agents that skip these create real bugs:

- **localStorage is load-bearing.** Never refactor `atlasmail_token`, `atlasmail_refresh_token`, `atlasmail_tokens`, `atlasmail_active_account_id`, `atlasmail_accounts`. Don't "migrate" them to cookies/sessionStorage. User settings that roam between devices go through the settings API; per-device cache/session stays in localStorage.
- **Always push to `main`.** Never create a branch for feature/fix work on this repo. Every `git push` targets `origin main`.
- **Never tag or release without explicit user permission.** Each tag is a separate ask. Bump + push to main is fine; `git tag` + `gh release create` is not.
- **Tables app is deprecated.** Don't resurrect it or reference the legacy code in `/legacy/tables/`.
- **No hardcoded hex colors.** Use CSS variables from `styles/theme.css`.
- **No raw HTML form elements.** See the UI primitives table above.
- **No `window.confirm()` or `window.alert()`.** Use `<ConfirmDialog>`.
- **Don't amend commits.** Always create a new commit, even after a failed pre-commit hook.
- **Don't skip git hooks** (no `--no-verify`, no `--no-gpg-sign`). If a hook fails, fix the underlying issue.

---

## Debugging recipes

**"I'm getting 401 on every request."**
- JWT secret mismatch. The server reads `.env` from the monorepo root (`packages/server/src/config/env.ts::rootEnv`), not `packages/server/.env`. If both exist with different secrets, the root wins.

**"Route returns 500 with a cryptic SQL error."**
- Usually schema drift. Check `information_schema.columns` vs `packages/server/src/db/schema.ts`. Fix: add `addColumnIfMissing` in bootstrap.

**"Route returns 500 with 'invalid input syntax for type uuid'."**
- You're hitting a `/:id` route with a non-UUID segment. Check for a route-order bug (is `/:id` defined before a more specific literal?). HR has a `router.param('id', ...)` guard — consider the same pattern.

**"Client shows blank page after deploy."**
- Usually `index.html` is served fine but the main JS chunk 404'd or the content hash changed. Hard refresh; if that doesn't help, check the Network tab for the `assets/index-*.js` request.

**"Sidebar item doesn't appear."**
- Forgot `appRegistry.register(...)` in `packages/client/src/apps/index.ts`. Or the `sidebarOrder` collides and it's below the fold.

**"OpenAPI path I just added doesn't show up in /api/v1/reference."**
- The module isn't imported from `registry.ts`. Every `paths/*.ts` file needs an `import './paths/myapp';` side-effect line.

**"`npm install` fails with peer dep errors."**
- Pre-existing tiptap conflict. Use `--legacy-peer-deps`. (Known tech debt.)

---

## Current pain points (known, not yet fixed)

- **tiptap peer conflict** requires `--legacy-peer-deps` on every install.
- **Translation files ~800KB each** are loaded upfront; no code-splitting yet.
- **Schema drift is possible** — there is no CI step that diffs Drizzle vs live DB. Relies on devs remembering to add `addColumnIfMissing`.
- **Most routes still use `register()` not `defineRoute()`** — so runtime validation is opt-in, not the default. Migrating in bulk is unsafe until every schema has been reconciled against controllers.
- **JWT payload doesn't have a `kid` (key id).** Rotating `JWT_SECRET` invalidates every session instantly.

These are known, documented here so you don't re-discover them every session.
