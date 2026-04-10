# Part 1: Monorepo Structure

## Root Layout

```
atlas/
├── package.json                  # Workspace root (npm workspaces)
├── tsconfig.base.json            # Shared TypeScript config
├── turbo.json                    # Turborepo pipeline config
├── .env.example                  # Environment variable template
├── .gitignore
├── .eslintrc.cjs                 # Shared ESLint config
├── .prettierrc                   # Shared Prettier config
│
├── packages/
│   ├── shared/                   # Shared types, utils, constants
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/
│   │       │   ├── index.ts
│   │       │   ├── email.ts          # Email, Thread, Attachment types
│   │       │   ├── account.ts        # Account, OAuthToken types
│   │       │   ├── category.ts       # Category, Rule types
│   │       │   ├── search.ts         # SearchQuery, SearchResult types
│   │       │   ├── settings.ts       # UserSettings, KeyBinding types
│   │       │   └── api.ts            # Request/Response envelope types
│   │       ├── constants/
│   │       │   ├── index.ts
│   │       │   ├── categories.ts     # Default category definitions
│   │       │   ├── shortcuts.ts      # Default keyboard shortcut map
│   │       │   └── theme.ts          # Theme token names
│   │       ├── utils/
│   │       │   ├── index.ts
│   │       │   ├── email-parser.ts   # Header parsing, address normalization
│   │       │   ├── date.ts           # Relative time, formatting
│   │       │   ├── categorizer.ts    # Rule-based email categorization logic
│   │       │   └── validators.ts     # Zod schemas for API payloads
│   │       └── schemas/
│   │           ├── index.ts
│   │           └── api-schemas.ts    # Zod schemas shared by client + server
│   │
│   ├── server/                   # Express API server
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts         # Drizzle ORM config for PostgreSQL
│   │   └── src/
│   │       ├── index.ts              # Server entry point
│   │       ├── app.ts                # Express app factory
│   │       ├── config/
│   │       │   ├── env.ts            # Environment variable loader (dotenv + zod)
│   │       │   ├── database.ts       # PostgreSQL connection pool (pg)
│   │       │   └── google.ts         # Google OAuth2 client config
│   │       ├── db/
│   │       │   ├── schema.ts         # Drizzle schema definitions
│   │       │   ├── migrations/       # SQL migration files
│   │       │   └── seed.ts           # Optional seed data
│   │       ├── middleware/
│   │       │   ├── auth.ts           # JWT verification middleware
│   │       │   ├── rate-limit.ts     # Rate limiter (express-rate-limit)
│   │       │   ├── error-handler.ts  # Global error handler
│   │       │   └── request-id.ts     # X-Request-Id header injection
│   │       ├── routes/
│   │       │   ├── index.ts          # Route aggregator
│   │       │   ├── auth.routes.ts    # /api/v1/auth/*
│   │       │   ├── emails.routes.ts  # /api/v1/emails/*
│   │       │   ├── threads.routes.ts # /api/v1/threads/*
│   │       │   ├── search.routes.ts  # /api/v1/search/*
│   │       │   ├── labels.routes.ts  # /api/v1/labels/*
│   │       │   ├── drafts.routes.ts  # /api/v1/drafts/*
│   │       │   └── settings.routes.ts# /api/v1/settings/*
│   │       ├── controllers/
│   │       │   ├── auth.controller.ts
│   │       │   ├── emails.controller.ts
│   │       │   ├── threads.controller.ts
│   │       │   ├── search.controller.ts
│   │       │   ├── labels.controller.ts
│   │       │   ├── drafts.controller.ts
│   │       │   └── settings.controller.ts
│   │       ├── services/
│   │       │   ├── auth.service.ts       # OAuth token exchange, refresh
│   │       │   ├── gmail.service.ts      # Gmail API wrapper
│   │       │   ├── sync.service.ts       # Full + incremental sync logic
│   │       │   ├── pubsub.service.ts     # Gmail push notification handler
│   │       │   ├── email.service.ts      # CRUD operations on emails table
│   │       │   ├── thread.service.ts     # Thread grouping and retrieval
│   │       │   ├── search.service.ts     # PostgreSQL full-text search
│   │       │   ├── categorizer.service.ts# Server-side categorization
│   │       │   └── settings.service.ts   # User settings persistence
│   │       ├── jobs/
│   │       │   ├── sync-scheduler.ts     # Periodic sync via BullMQ
│   │       │   ├── sync-worker.ts        # BullMQ worker for sync jobs
│   │       │   └── cleanup.ts            # Expired token / stale data cleanup
│   │       └── utils/
│   │           ├── logger.ts             # Pino logger
│   │           ├── gmail-parser.ts       # Parse Gmail API response to our types
│   │           └── crypto.ts             # Token encryption helpers
│   │
│   ├── client/                   # React + Vite web app
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx              # React DOM entry
│   │       ├── App.tsx               # Root component (providers, router)
│   │       ├── vite-env.d.ts
│   │       ├── assets/
│   │       │   └── fonts/
│   │       ├── styles/
│   │       │   ├── global.css
│   │       │   ├── reset.css
│   │       │   └── theme.css         # CSS custom properties for themes
│   │       ├── config/
│   │       │   ├── env.ts            # VITE_ env var access
│   │       │   ├── routes.ts         # Route path constants
│   │       │   └── query-keys.ts     # TanStack Query key factory
│   │       ├── lib/
│   │       │   ├── api-client.ts     # Axios/ky instance with interceptors
│   │       │   ├── local-db.ts       # SQLite (sql.js / wa-sqlite) wrapper
│   │       │   ├── sync-engine.ts    # Client-side sync orchestrator
│   │       │   ├── shortcut-engine.ts# Keyboard shortcut manager
│   │       │   └── platform.ts       # Detect web vs Electron runtime
│   │       ├── hooks/
│   │       │   ├── use-auth.ts
│   │       │   ├── use-emails.ts
│   │       │   ├── use-threads.ts
│   │       │   ├── use-search.ts
│   │       │   ├── use-shortcuts.ts
│   │       │   ├── use-theme.ts
│   │       │   ├── use-local-db.ts
│   │       │   ├── use-sync.ts
│   │       │   └── use-category.ts
│   │       ├── stores/
│   │       │   ├── auth-store.ts     # Zustand store for auth state
│   │       │   ├── email-store.ts    # Zustand store for email UI state
│   │       │   ├── ui-store.ts       # Sidebar open, active panel, etc.
│   │       │   └── settings-store.ts # Theme, shortcuts, preferences
│   │       ├── providers/
│   │       │   ├── auth-provider.tsx
│   │       │   ├── theme-provider.tsx
│   │       │   ├── query-provider.tsx
│   │       │   ├── shortcut-provider.tsx
│   │       │   └── local-db-provider.tsx
│   │       ├── components/
│   │       │   ├── ui/                   # Thin wrappers around Radix primitives
│   │       │   │   ├── button.tsx
│   │       │   │   ├── input.tsx
│   │       │   │   ├── dialog.tsx
│   │       │   │   ├── dropdown-menu.tsx
│   │       │   │   ├── tooltip.tsx
│   │       │   │   ├── avatar.tsx
│   │       │   │   ├── badge.tsx
│   │       │   │   ├── command-palette.tsx  # Cmd+K style command palette
│   │       │   │   ├── kbd.tsx              # Keyboard shortcut display
│   │       │   │   └── scroll-area.tsx
│   │       │   ├── layout/
│   │       │   │   ├── app-layout.tsx       # Three-pane layout shell
│   │       │   │   ├── sidebar.tsx          # Left sidebar (accounts, categories)
│   │       │   │   ├── email-list-pane.tsx  # Middle pane (email list)
│   │       │   │   └── reading-pane.tsx     # Right pane (email content)
│   │       │   ├── email/
│   │       │   │   ├── email-list-item.tsx
│   │       │   │   ├── email-thread.tsx
│   │       │   │   ├── email-message.tsx
│   │       │   │   ├── email-header.tsx
│   │       │   │   ├── email-body.tsx       # Sandboxed HTML renderer
│   │       │   │   ├── email-attachments.tsx
│   │       │   │   └── email-actions.tsx    # Reply, forward, archive, etc.
│   │       │   ├── compose/
│   │       │   │   ├── compose-modal.tsx
│   │       │   │   ├── compose-editor.tsx   # Tiptap rich text editor
│   │       │   │   ├── recipient-input.tsx  # Autocomplete address input
│   │       │   │   └── attachment-picker.tsx
│   │       │   ├── search/
│   │       │   │   ├── search-bar.tsx
│   │       │   │   ├── search-results.tsx
│   │       │   │   └── search-filters.tsx
│   │       │   ├── settings/
│   │       │   │   ├── settings-dialog.tsx
│   │       │   │   ├── account-settings.tsx
│   │       │   │   ├── shortcut-settings.tsx
│   │       │   │   └── theme-settings.tsx
│   │       │   └── auth/
│   │       │       ├── login-page.tsx
│   │       │       └── oauth-callback.tsx
│   │       └── pages/
│   │           ├── inbox.tsx
│   │           ├── sent.tsx
│   │           ├── drafts.tsx
│   │           ├── trash.tsx
│   │           ├── search-results.tsx
│   │           ├── settings.tsx
│   │           └── login.tsx
│   │
│   └── desktop/                  # Electron shell
│       ├── package.json
│       ├── tsconfig.json
│       ├── electron-builder.yml      # Build config (DMG, NSIS, AppImage)
│       └── src/
│           ├── main.ts               # Electron main process
│           ├── preload.ts            # Context bridge for IPC
│           ├── ipc/
│           │   ├── handlers.ts       # IPC handler registration
│           │   ├── auth-handler.ts   # OS-level OAuth callback (deep link)
│           │   ├── db-handler.ts     # SQLite operations via better-sqlite3
│           │   ├── sync-handler.ts   # Background sync orchestrator
│           │   └── notification-handler.ts # Native OS notifications
│           ├── services/
│           │   ├── local-db.ts       # better-sqlite3 wrapper + migrations
│           │   ├── gmail-direct.ts   # Direct Gmail API calls (no server)
│           │   └── auto-updater.ts   # Electron auto-update
│           ├── db/
│           │   ├── migrations/       # SQLite migration SQL files
│           │   └── schema.sql        # Full SQLite schema
│           └── utils/
│               ├── deep-link.ts      # Custom protocol (atlas://)
│               └── tray.ts           # System tray icon + menu
│
├── docs/
│   └── architecture/             # This document set
│
└── scripts/
    ├── setup.sh                  # First-time dev environment setup
    ├── dev.sh                    # Start all packages in dev mode
    └── db-migrate.sh             # Run database migrations
```

## Key Architectural Decisions

### Why Turborepo over Nx
Turborepo is lighter, requires less configuration, and works natively with npm
workspaces. AtlasMail does not need Nx's code generation or plugin ecosystem.
Turborepo's pipeline caching and parallel task execution are sufficient.

### Why Drizzle over Prisma for the server
Drizzle produces thinner SQL, supports PostgreSQL full-text search operators
natively (to_tsvector, ts_rank), and its schema definition is pure TypeScript
that can live alongside the rest of the server code. Prisma's query engine
binary adds deployment weight and its full-text search support is limited.

### Why better-sqlite3 in Electron, sql.js in web
- Electron's main process can use better-sqlite3 (native C binding) for maximum
  SQLite performance. FTS5 is compiled in by default.
- The web client uses sql.js (SQLite compiled to WebAssembly) loaded in a Web
  Worker so the UI thread never blocks. FTS5 is available in the WASM build.
- Both share the same SQL schema defined in packages/shared.

### Electron loading the Vite app
In development, Electron loads `http://localhost:5173` (Vite dev server).
In production, Electron loads the built files from `packages/client/dist/index.html`
via `file://` protocol. The `packages/client` build output is bundled into the
Electron app by electron-builder.
