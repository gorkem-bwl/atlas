# Part 11: Electron + Web Code Sharing Strategy

The same React application runs in both a browser (web) and Electron (desktop).
This section details how code is shared, what differs between platforms, and
how the build pipeline works.

---

## 11.1 Shared vs Platform-Specific Code

```
┌─────────────────────────────────────────────────────────────┐
│                     packages/shared                          │
│  Types, constants, validators, categorizer logic             │
│  100% shared — runs everywhere                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
┌──────────▼─────────┐          ┌──────────▼─────────┐
│  packages/client    │          │  packages/desktop   │
│                     │          │                     │
│  React app          │          │  Electron shell     │
│  (Vite build)       │          │  (main process)     │
│                     │          │                     │
│  Runs in browser    │          │  Loads the same     │
│  OR in Electron's   │          │  React app in       │
│  renderer process   │          │  a BrowserWindow    │
│                     │          │                     │
│  Data source:       │          │  Data source:       │
│  Express API        │          │  Local SQLite +     │
│  (via HTTP)         │          │  Gmail API direct   │
└─────────────────────┘          └─────────────────────┘
```

### What is shared (packages/client runs identically in both):
- All React components (layout, email list, reading pane, compose)
- All Zustand stores
- All hooks (except data source hooks — see below)
- Theme system (CSS custom properties)
- Keyboard shortcut engine
- Routing (React Router)

### What differs by platform:
| Concern           | Web                          | Electron                       |
|-------------------|------------------------------|--------------------------------|
| Data fetching     | HTTP to Express API          | IPC to main process            |
| Local database    | sql.js (WASM in Web Worker)  | better-sqlite3 (native)        |
| Auth flow         | Browser redirect             | Deep link (atlas://)       |
| Token storage     | httpOnly cookie / memory     | OS keychain                    |
| Notifications     | Web Notifications API        | Electron native notifications  |
| Auto-update       | N/A (Vercel deploys)         | electron-updater               |
| File downloads    | Browser download             | Electron dialog.showSaveDialog |
| Sync engine       | Server-side (BullMQ)         | Main process (local)           |

---

## 11.2 Platform Abstraction Layer

A platform adapter interface abstracts the differences. The correct
implementation is injected via React Context.

```typescript
// packages/client/src/lib/platform.ts

export type Platform = 'web' | 'electron';

export function detectPlatform(): Platform {
  // Electron exposes a flag via the preload script
  if (typeof window !== 'undefined' && (window as any).__ATLASMAIL_ELECTRON__) {
    return 'electron';
  }
  return 'web';
}

// Platform adapter interface
export interface PlatformAdapter {
  platform: Platform;

  // Data operations
  fetchThreads(params: ThreadListParams): Promise<Thread[]>;
  fetchThread(threadId: string): Promise<ThreadDetail>;
  archiveThread(threadId: string): Promise<void>;
  starThread(threadId: string): Promise<void>;
  markRead(threadId: string): Promise<void>;
  sendEmail(draft: DraftEmail): Promise<void>;
  searchEmails(query: string): Promise<SearchResult[]>;

  // Auth
  initiateLogin(): Promise<void>;
  getAuthState(): Promise<AuthState>;
  logout(): Promise<void>;

  // Sync
  triggerSync(): Promise<void>;
  getSyncStatus(): Promise<SyncStatus>;

  // Settings
  getSettings(): Promise<UserSettings>;
  updateSettings(settings: Partial<UserSettings>): Promise<void>;
}
```

### Web adapter:

```typescript
// packages/client/src/lib/adapters/web-adapter.ts

import { apiClient } from '../api-client';
import type { PlatformAdapter } from '../platform';

export class WebAdapter implements PlatformAdapter {
  platform = 'web' as const;

  async fetchThreads(params: ThreadListParams) {
    const { data } = await apiClient.get('/threads', { params });
    return data.data;
  }

  async fetchThread(threadId: string) {
    const { data } = await apiClient.get(`/threads/${threadId}`);
    return data.data;
  }

  async archiveThread(threadId: string) {
    await apiClient.post(`/threads/${threadId}/archive`);
  }

  async sendEmail(draft: DraftEmail) {
    await apiClient.post('/emails/send', draft);
  }

  async searchEmails(query: string) {
    const { data } = await apiClient.get('/search', { params: { q: query } });
    return data.data;
  }

  async initiateLogin() {
    const { data } = await apiClient.get('/auth/google/url', {
      params: { redirect_uri: `${window.location.origin}/auth/callback` },
    });
    sessionStorage.setItem('oauth_code_verifier', data.data.code_verifier);
    window.location.href = data.data.url;
  }

  // ... remaining methods follow the same pattern
}
```

### Electron adapter:

```typescript
// packages/client/src/lib/adapters/electron-adapter.ts

import type { PlatformAdapter } from '../platform';

// Access Electron IPC via the preload-exposed bridge
const ipc = (window as any).__ATLASMAIL_IPC__;

export class ElectronAdapter implements PlatformAdapter {
  platform = 'electron' as const;

  async fetchThreads(params: ThreadListParams) {
    return ipc.invoke('db:threads:list', params);
  }

  async fetchThread(threadId: string) {
    return ipc.invoke('db:threads:get', threadId);
  }

  async archiveThread(threadId: string) {
    // Write to SQLite immediately, then sync to Gmail in background
    return ipc.invoke('action:archive', threadId);
  }

  async sendEmail(draft: DraftEmail) {
    // Send directly via Gmail API from main process
    return ipc.invoke('gmail:send', draft);
  }

  async searchEmails(query: string) {
    // Search local SQLite FTS5 index
    return ipc.invoke('db:search', query);
  }

  async initiateLogin() {
    return ipc.invoke('auth:login');
  }

  // ... remaining methods
}
```

### Provider:

```typescript
// packages/client/src/providers/platform-provider.tsx

import { createContext, useContext, useMemo } from 'react';
import { detectPlatform, PlatformAdapter } from '../lib/platform';
import { WebAdapter } from '../lib/adapters/web-adapter';
import { ElectronAdapter } from '../lib/adapters/electron-adapter';

const PlatformContext = createContext<PlatformAdapter | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const adapter = useMemo(() => {
    const platform = detectPlatform();
    return platform === 'electron' ? new ElectronAdapter() : new WebAdapter();
  }, []);

  return (
    <PlatformContext.Provider value={adapter}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformAdapter {
  const adapter = useContext(PlatformContext);
  if (!adapter) throw new Error('usePlatform must be used within PlatformProvider');
  return adapter;
}
```

### Hooks use the adapter:

```typescript
// packages/client/src/hooks/use-threads.ts

import { useQuery } from '@tanstack/react-query';
import { usePlatform } from '../providers/platform-provider';
import { queryKeys } from '../config/query-keys';

export function useThreads(category?: string) {
  const platform = usePlatform();

  return useQuery({
    queryKey: queryKeys.threads.list({ category }),
    queryFn: () => platform.fetchThreads({ category, per_page: 50 }),
    staleTime: 30_000,
  });
}
```

This means all components are completely platform-agnostic. They call hooks,
which call the platform adapter, which routes to either HTTP or IPC.

---

## 11.3 Electron Preload Script

The preload script exposes a safe IPC bridge to the renderer:

```typescript
// packages/desktop/src/preload.ts

import { contextBridge, ipcRenderer } from 'electron';

// Mark this as Electron
contextBridge.exposeInMainWorld('__ATLASMAIL_ELECTRON__', true);

// Expose IPC invoke (safe: only allows whitelisted channels)
const ALLOWED_CHANNELS = [
  'db:threads:list',
  'db:threads:get',
  'db:search',
  'action:archive',
  'action:trash',
  'action:star',
  'action:read',
  'action:unread',
  'gmail:send',
  'gmail:reply',
  'auth:login',
  'auth:logout',
  'auth:state',
  'sync:trigger',
  'sync:status',
  'settings:get',
  'settings:update',
  'app:theme',
];

contextBridge.exposeInMainWorld('__ATLASMAIL_IPC__', {
  invoke: (channel: string, ...args: any[]) => {
    if (ALLOWED_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`IPC channel "${channel}" is not allowed`);
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const allowedEvents = ['sync:progress', 'sync:complete', 'auth:success', 'notification:new'];
    if (allowedEvents.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
```

---

## 11.4 Build Pipeline

### Development:

```bash
# Terminal 1: Start the Vite dev server (packages/client)
npm run dev --workspace=packages/client
# Starts at http://localhost:5173

# Terminal 2: Start Electron pointed at the Vite dev server
npm run dev --workspace=packages/desktop
# Opens Electron window loading http://localhost:5173

# Terminal 3: Start the Express server (for web mode testing)
npm run dev --workspace=packages/server
# Starts at http://localhost:3001
```

### Production build:

```bash
# 1. Build shared package
npm run build --workspace=packages/shared

# 2. Build the React app (same output used by both web and Electron)
npm run build --workspace=packages/client
# Output: packages/client/dist/

# 3. Build the Express server
npm run build --workspace=packages/server

# 4. Build Electron (bundles client/dist into the app)
npm run build --workspace=packages/desktop
# Output: packages/desktop/dist/ (DMG, exe, AppImage)
```

### Electron main process configuration:

```typescript
// packages/desktop/src/main.ts

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',  // Native macOS title bar
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '..', '..', 'client', 'dist', 'index.html')
    );
  }
}
```

### Vite configuration:

```typescript
// packages/client/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@atlas-platform/shared': path.resolve(__dirname, '..', 'shared', 'src'),
    },
  },
  build: {
    // Ensure output works for both web (Vercel) and Electron (file://)
    base: './',  // Relative paths for Electron file:// loading
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to Express in development
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 11.5 Electron-Specific Features

These features exist only in Electron and are not available in the web app:

1. **System tray icon** — shows unread count badge, quick actions menu.
2. **Native notifications** — uses Electron's `Notification` API for new emails.
3. **Global shortcut** — register Cmd+Shift+M to toggle the window.
4. **Auto-updater** — checks for updates via electron-updater (GitHub Releases).
5. **Offline mode** — full app works without internet (reads from SQLite).
6. **Menu bar** — native application menu with all actions.
7. **Deep links** — `atlas://compose?to=alice@example.com` opens compose.

### Conditional imports:

Features that reference Electron modules never appear in `packages/client`.
They live exclusively in `packages/desktop`. The React app communicates with
them solely through the IPC bridge defined in the preload script.
