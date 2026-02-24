# AtlasMail Architecture Overview

## Document Index

| Part | File | Contents |
|------|------|----------|
| 1 | `01-monorepo-structure.md` | Full directory tree, architectural decisions, package roles |
| 2 | `02-database-schemas.md` | PostgreSQL schema (Drizzle), SQLite schema, FTS indexes, token security |
| 3 | `03-api-design.md` | All REST endpoints, request/response formats, rate limiting, error handling |
| 4 | `04-gmail-sync.md` | Full sync, incremental sync (historyId), Pub/Sub push, Electron offline sync |
| 5 | `05-categorization.md` | Rule engine, system heuristics, contact-based importance, condition schema |
| 6 | `06-search-architecture.md` | FTS5 (SQLite), tsvector (PostgreSQL), query syntax, merge strategy |
| 7 | `07-auth-flow.md` | Google OAuth2 + PKCE for web and Electron, token refresh, JWT strategy |
| 8 | `08-state-management.md` | Zustand stores, TanStack Query patterns, optimistic updates, data flow |
| 9 | `09-keyboard-shortcuts.md` | ShortcutEngine class, key sequences, context system, command palette |
| 10 | `10-theme-system.md` | CSS custom properties, dark/light tokens, density, Radix integration |
| 11 | `11-electron-web-sharing.md` | Platform adapter pattern, preload script, build pipeline |
| 12 | `12-dependencies.md` | All package.json files, dependency rationale, tsconfig, env vars |

---

## System Architecture Diagram

```
                          ┌──────────────────────────────────────┐
                          │              Google Cloud             │
                          │  ┌──────────┐    ┌───────────────┐   │
                          │  │ Gmail API │    │ Cloud Pub/Sub │   │
                          │  └─────┬────┘    └───────┬───────┘   │
                          │        │                 │           │
                          └────────┼─────────────────┼───────────┘
                                   │                 │
                    ┌──────────────┼─────────────────┼──────────────┐
                    │              ▼                 ▼              │
                    │    ┌──────────────────────────────────────┐   │
                    │    │         Express API Server           │   │
                    │    │                                      │   │
     ┌──────────┐  │    │  Auth    Sync     Search   Email     │   │
     │  Vercel   │  │    │  Service Service  Service  Service   │   │
     │  (deploy) │──│──▶ │                                      │   │
     └──────────┘  │    │  ┌─────────┐    ┌─────────────────┐  │   │
                    │    │  │ BullMQ  │    │   PostgreSQL    │  │   │
                    │    │  │ + Redis │    │   (persistent   │  │   │
                    │    │  │ (jobs)  │    │    storage)     │  │   │
                    │    │  └─────────┘    └─────────────────┘  │   │
                    │    └──────────────────────────────────────┘   │
                    │                        │                     │
                    │              Server infrastructure           │
                    └────────────────────────┼──────────────────────┘
                                             │ REST API
                               ┌─────────────┴─────────────┐
                               │                           │
                    ┌──────────▼──────────┐     ┌──────────▼──────────┐
                    │    Web Client        │     │   Electron Client   │
                    │    (Browser)         │     │   (Desktop App)     │
                    │                     │     │                     │
                    │  React + Vite       │     │  React + Vite       │
                    │  Zustand + TQ       │     │  Zustand + TQ       │
                    │  sql.js (WASM)      │     │  better-sqlite3     │
                    │                     │     │                     │
                    │  Data: via API      │     │  Data: local SQLite │
                    │  Auth: server-side  │     │  Auth: OS keychain  │
                    │  Sync: server-side  │     │  Sync: direct Gmail │
                    └─────────────────────┘     └─────────────────────┘
```

---

## Implementation Order (Recommended Phases)

### Phase 1: Foundation (Weeks 1-2)
1. Set up monorepo with Turborepo + npm workspaces
2. Configure TypeScript, ESLint, Prettier
3. Define shared types and Zod schemas (packages/shared)
4. Set up PostgreSQL + Drizzle, run migrations
5. Implement Google OAuth flow (server + web)
6. Basic Express API: auth endpoints, account CRUD

### Phase 2: Email Sync (Weeks 3-4)
1. Gmail API integration (gmail.service.ts)
2. Full sync implementation
3. Incremental sync via historyId
4. Message parsing pipeline
5. Thread aggregation logic
6. Store in PostgreSQL, test with real Gmail data

### Phase 3: Core UI (Weeks 5-6)
1. App layout (three-pane: sidebar, list, reading)
2. Thread list with virtualization (react-virtuoso)
3. Email reading pane with safe HTML rendering
4. Category tabs (Important/Other/Newsletters/Notifications)
5. Categorization engine (shared package)
6. Theme system (light/dark/system)

### Phase 4: Compose + Actions (Week 7)
1. Compose modal with Tiptap editor
2. Reply/Reply All/Forward
3. Draft auto-save
4. Archive, trash, star, mark read/unread
5. Optimistic updates with undo (react-hot-toast)

### Phase 5: Search + Shortcuts (Week 8)
1. PostgreSQL full-text search
2. Search bar UI with filters
3. Keyboard shortcut engine
4. Bind all default shortcuts
5. Command palette (Cmd+K)

### Phase 6: Electron (Weeks 9-10)
1. Electron shell (main process, preload, IPC)
2. Platform adapter (ElectronAdapter)
3. SQLite local database with FTS5
4. Direct Gmail API calls from main process
5. OS keychain for token storage
6. Local sync engine
7. Native notifications, system tray

### Phase 7: Polish + Production (Weeks 11-12)
1. Gmail Pub/Sub push notifications
2. BullMQ sync scheduler
3. Rate limiting, error handling, logging
4. Auto-updater for Electron
5. Vercel deployment for web
6. Electron builds (DMG, exe, AppImage)
7. Performance profiling and optimization

---

## Key Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gmail API rate limits (250 quota units/s/user) | Slow initial sync | Batch requests, respect Retry-After headers, show progress bar |
| OAuth token expiration | Broken sync, 401 errors | Auto-refresh with retry queue, graceful degradation |
| Email HTML rendering security | XSS attacks | DOMPurify sanitization, sandboxed iframe, CSP headers |
| Large mailbox performance (100k+ emails) | Slow queries, high memory | Virtualized list, pagination, FTS5 for search, indexed queries |
| Electron app size | Large download | Differential updates, exclude devDependencies, optimize assets |
| Gmail Pub/Sub reliability | Missed notifications | Fallback polling every 60 seconds, historyId ensures no gaps |
| SQLite WASM performance (web) | Slow search in browser | Web Worker isolation, limit local cache size, defer to server search |
| Offline-to-online sync conflicts | Data inconsistency | Last-write-wins with timestamp comparison, queued actions |
