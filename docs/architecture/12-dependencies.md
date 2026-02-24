# Part 12: Package Dependencies

All versions shown are current as of early 2026. Pin exact versions in
package.json to avoid surprise breaking changes.

---

## 12.1 Root package.json

```jsonc
{
  "name": "atlasmail",
  "private": true,
  "workspaces": [
    "packages/shared",
    "packages/server",
    "packages/client",
    "packages/desktop"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "prettier": "^3.4.0"
  }
}
```

---

## 12.2 packages/shared

```jsonc
{
  "name": "@atlasmail/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "zod": "^3.24.0"
    // Zod for runtime validation schemas shared between client and server
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**Why these choices:**
- `zod` — Runtime type validation. Shared schemas are defined once in this
  package and used by both the server (request validation) and client
  (form validation). Zero external dependencies.

---

## 12.3 packages/server

```jsonc
{
  "name": "@atlasmail/server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    // ── Framework ───────────────────────────────────
    "express": "^5.0.0",          // HTTP framework
    "@types/express": "^5.0.0",

    // ── Database ────────────────────────────────────
    "drizzle-orm": "^0.36.0",     // SQL query builder + ORM
    "pg": "^8.13.0",              // PostgreSQL client
    "@types/pg": "^8.11.0",
    "drizzle-kit": "^0.28.0",     // Migration CLI

    // ── Google APIs ─────────────────────────────────
    "googleapis": "^144.0.0",     // Gmail API client
    "google-auth-library": "^9.15.0",  // OAuth2 client

    // ── Auth ────────────────────────────────────────
    "jsonwebtoken": "^9.0.0",     // JWT signing/verification
    "@types/jsonwebtoken": "^9.0.0",

    // ── Job Queue ───────────────────────────────────
    "bullmq": "^5.25.0",         // Background job processing
    "ioredis": "^5.4.0",          // Redis client (required by BullMQ)

    // ── Security ────────────────────────────────────
    "helmet": "^8.0.0",           // HTTP security headers
    "cors": "^2.8.0",             // CORS middleware
    "@types/cors": "^2.8.0",
    "express-rate-limit": "^7.4.0",  // Rate limiting

    // ── Validation ──────────────────────────────────
    "zod": "^3.24.0",             // Request validation (shared schemas)

    // ── Logging ─────────────────────────────────────
    "pino": "^9.5.0",             // Structured JSON logger
    "pino-pretty": "^13.0.0",     // Dev-mode log formatting

    // ── Utilities ───────────────────────────────────
    "dotenv": "^16.4.0",          // Environment variable loading
    "uuid": "^11.0.0",            // UUID generation
    "@types/uuid": "^10.0.0",
    "date-fns": "^4.1.0",         // Date manipulation

    // ── Workspace dependency ────────────────────────
    "@atlasmail/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tsx": "^4.19.0",             // TypeScript execution (dev mode)
    "vitest": "^2.1.0",           // Testing
    "@types/node": "^22.0.0"
  }
}
```

**Key decisions:**
- `express@5` — v5 has native async error handling (no need for express-async-errors).
- `drizzle-orm` over `prisma` — lighter, better PostgreSQL full-text search support,
  no binary query engine. See Part 1 for rationale.
- `bullmq` + `ioredis` — production-grade job queue. Used for email sync jobs,
  watch renewal, periodic tasks. Redis is also available for API response caching later.
- `tsx` — runs TypeScript directly in development without a build step.

---

## 12.4 packages/client

```jsonc
{
  "name": "@atlasmail/client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    // ── React ───────────────────────────────────────
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",  // Client-side routing

    // ── UI Components (Radix) ───────────────────────
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-popover": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-visually-hidden": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-label": "^2.1.0",

    // ── State Management ────────────────────────────
    "zustand": "^5.0.0",          // Client-side state
    "@tanstack/react-query": "^5.62.0",  // Server state + caching

    // ── Rich Text Editor ────────────────────────────
    "@tiptap/react": "^2.10.0",    // Compose editor
    "@tiptap/starter-kit": "^2.10.0",
    "@tiptap/extension-link": "^2.10.0",
    "@tiptap/extension-image": "^2.10.0",
    "@tiptap/extension-placeholder": "^2.10.0",
    "@tiptap/extension-underline": "^2.10.0",
    "@tiptap/extension-text-align": "^2.10.0",

    // ── HTTP Client ─────────────────────────────────
    "axios": "^1.7.0",            // HTTP client with interceptors

    // ── Local Database ──────────────────────────────
    "sql.js": "^1.11.0",          // SQLite WASM for web client

    // ── Security ────────────────────────────────────
    "dompurify": "^3.2.0",        // HTML sanitization for email bodies
    "@types/dompurify": "^3.0.0",

    // ── Utilities ───────────────────────────────────
    "date-fns": "^4.1.0",         // Date formatting
    "clsx": "^2.1.0",             // Conditional CSS class names
    "react-virtuoso": "^4.12.0",  // Virtualized email list rendering
    "react-hot-toast": "^2.4.0",  // Toast notifications (undo actions)

    // ── Workspace dependency ────────────────────────
    "@atlasmail/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@types/node": "^22.0.0"
  }
}
```

**Key decisions:**
- `react-virtuoso` — the email list can have thousands of items. Virtualization
  ensures only visible items are rendered. react-virtuoso handles variable-height
  items and smooth scrolling better than react-window.
- `@tiptap` — ProseMirror-based rich text editor. Chosen over Draft.js
  (deprecated) and Slate (less mature). Tiptap has excellent extension support
  for links, images, and formatting — all essential for email composition.
- `sql.js` — SQLite compiled to WebAssembly. Enables the same FTS5 search in
  the browser that better-sqlite3 provides in Electron. Runs in a Web Worker.
- `dompurify` — emails contain arbitrary HTML. Every email body must be sanitized
  before rendering to prevent XSS. DOMPurify is the industry standard.
- `axios` over `fetch` — interceptors for automatic token refresh (see Part 7).

---

## 12.5 packages/desktop

```jsonc
{
  "name": "@atlasmail/desktop",
  "version": "0.1.0",
  "private": true,
  "main": "dist/main.js",
  "scripts": {
    "dev": "electron .",
    "build": "tsc && electron-builder",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    // ── Database ────────────────────────────────────
    "better-sqlite3": "^11.6.0",   // Native SQLite with FTS5 support
    "@types/better-sqlite3": "^7.6.0",

    // ── Google APIs ─────────────────────────────────
    "googleapis": "^144.0.0",      // Direct Gmail API access
    "google-auth-library": "^9.15.0",

    // ── Credential storage ──────────────────────────
    "keytar": "^7.9.0",            // OS keychain access

    // ── Auto-update ─────────────────────────────────
    "electron-updater": "^6.3.0",  // GitHub Releases auto-update

    // ── Logging ─────────────────────────────────────
    "electron-log": "^5.2.0",      // File-based logging

    // ── Utilities ───────────────────────────────────
    "uuid": "^11.0.0",
    "date-fns": "^4.1.0",

    // ── Workspace dependency ────────────────────────
    "@atlasmail/shared": "workspace:*"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.1.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0"
  }
}
```

**Key decisions:**
- `better-sqlite3` — synchronous SQLite driver with native bindings.
  Significantly faster than sql.js in Node.js context. FTS5 extension is
  compiled in by default. Synchronous API is fine in Electron's main process
  (or can be moved to a utility process for heavy operations).
- `keytar` — cross-platform OS keychain access. Stores OAuth tokens in macOS
  Keychain, Windows Credential Manager, or Linux Secret Service. Never stores
  tokens in SQLite or the filesystem.
- `electron-updater` — auto-update from GitHub Releases. Supports differential
  updates on macOS (DMG) and Windows (NSIS).
- Electron itself is a dev dependency because electron-builder bundles its own
  Electron runtime into the distributable.

---

## 12.6 turbo.json

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "clean": {
      "cache": false
    }
  }
}
```

The `^build` dependency ensures `packages/shared` is built before any package
that imports from it.

---

## 12.7 tsconfig.base.json

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Each package extends this and adds its own `outDir`, `rootDir`, `include`,
and any additional compiler options (e.g., `jsx: "react-jsx"` for the client).

---

## 12.8 Environment Variables

```bash
# .env.example

# ── Server ──────────────────────────────────────────
NODE_ENV=development
PORT=3001

# ── PostgreSQL ──────────────────────────────────────
DATABASE_URL=postgresql://atlasmail:password@localhost:5432/atlasmail

# ── Redis (for BullMQ) ─────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Google OAuth ────────────────────────────────────
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# ── JWT ─────────────────────────────────────────────
JWT_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-other-256-bit-secret

# ── Encryption (for OAuth tokens at rest) ──────────
TOKEN_ENCRYPTION_KEY=32-byte-hex-key

# ── Google Cloud Pub/Sub ────────────────────────────
GOOGLE_CLOUD_PROJECT=atlasmail
GOOGLE_PUBSUB_TOPIC=gmail-push

# ── Client (Vite) ──────────────────────────────────
VITE_API_URL=http://localhost:3001/api/v1
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```
