# Part 8: State Management

AtlasMail uses a layered state management approach: Zustand for client-side UI
state, TanStack Query for server/async data, and the local SQLite database as
a persistent cache.

---

## 8.1 State Layer Architecture

```
  ┌────────────────────────────────────────────────────────┐
  │                    React Components                     │
  └────────────┬───────────┬───────────┬───────────────────┘
               │           │           │
    ┌──────────▼──┐  ┌─────▼─────┐  ┌─▼──────────────────┐
    │   Zustand    │  │ TanStack  │  │ Local SQLite       │
    │   Stores     │  │ Query     │  │ (via React Context)│
    │              │  │           │  │                    │
    │  - UI state  │  │ - Server  │  │ - Persistent       │
    │  - Auth      │  │   data    │  │   email cache      │
    │  - Theme     │  │ - Caching │  │ - Offline data     │
    │  - Selection │  │ - Sync    │  │ - FTS5 search      │
    └──────────────┘  └───────────┘  └────────────────────┘
```

### Why this combination:

1. **Zustand** for synchronous, client-only state (currently selected email,
   sidebar open/closed, compose modal state, keyboard focus position). Zustand
   is chosen over Redux because it has zero boilerplate, works outside React
   components, and the store is a plain function — no providers needed.

2. **TanStack Query** for all async data fetching from the Express server.
   It handles caching, background refetching, optimistic updates, and request
   deduplication. Every API call goes through TanStack Query.

3. **Local SQLite** for persistent offline storage. In Electron, this is the
   primary data source — the app reads from SQLite and syncs with Gmail in
   the background. In the web app, it is an optional acceleration layer.

---

## 8.2 Zustand Stores

### Auth Store

```typescript
// packages/client/src/stores/auth-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Account {
  id: string;
  email: string;
  name: string;
  picture_url: string | null;
}

interface AuthState {
  accessToken: string | null;
  account: Account | null;
  isAuthenticated: boolean;

  setAuth: (data: { accessToken: string; account: Account }) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      account: null,
      isAuthenticated: false,

      setAuth: ({ accessToken, account }) =>
        set({ accessToken, account, isAuthenticated: true }),

      setAccessToken: (token) =>
        set({ accessToken: token }),

      logout: () =>
        set({ accessToken: null, account: null, isAuthenticated: false }),
    }),
    {
      name: 'atlasmail-auth',
      // Only persist account info, not the access token
      partialize: (state) => ({ account: state.account }),
    },
  ),
);
```

### Email UI Store

```typescript
// packages/client/src/stores/email-store.ts

import { create } from 'zustand';

type Category = 'important' | 'other' | 'newsletters' | 'notifications';

interface EmailUIState {
  // Current view
  activeCategory: Category;
  activeThreadId: string | null;
  activeEmailId: string | null;

  // Selection (for batch operations)
  selectedThreadIds: Set<string>;

  // List cursor position (for keyboard navigation)
  cursorIndex: number;

  // Compose state
  composeOpen: boolean;
  composeMode: 'new' | 'reply' | 'reply_all' | 'forward' | null;
  composeReplyToEmailId: string | null;

  // Actions
  setActiveCategory: (category: Category) => void;
  setActiveThread: (threadId: string | null) => void;
  setActiveEmail: (emailId: string | null) => void;
  setCursorIndex: (index: number) => void;
  moveCursor: (delta: number, maxIndex: number) => void;
  toggleThreadSelection: (threadId: string) => void;
  selectAllThreads: (threadIds: string[]) => void;
  clearSelection: () => void;
  openCompose: (mode: 'new' | 'reply' | 'reply_all' | 'forward', replyToId?: string) => void;
  closeCompose: () => void;
}

export const useEmailStore = create<EmailUIState>((set, get) => ({
  activeCategory: 'important',
  activeThreadId: null,
  activeEmailId: null,
  selectedThreadIds: new Set(),
  cursorIndex: 0,
  composeOpen: false,
  composeMode: null,
  composeReplyToEmailId: null,

  setActiveCategory: (category) =>
    set({ activeCategory: category, activeThreadId: null, cursorIndex: 0 }),

  setActiveThread: (threadId) =>
    set({ activeThreadId: threadId }),

  setActiveEmail: (emailId) =>
    set({ activeEmailId: emailId }),

  setCursorIndex: (index) =>
    set({ cursorIndex: index }),

  moveCursor: (delta, maxIndex) => {
    const newIndex = Math.max(0, Math.min(get().cursorIndex + delta, maxIndex));
    set({ cursorIndex: newIndex });
  },

  toggleThreadSelection: (threadId) => {
    const current = new Set(get().selectedThreadIds);
    if (current.has(threadId)) {
      current.delete(threadId);
    } else {
      current.add(threadId);
    }
    set({ selectedThreadIds: current });
  },

  selectAllThreads: (threadIds) =>
    set({ selectedThreadIds: new Set(threadIds) }),

  clearSelection: () =>
    set({ selectedThreadIds: new Set() }),

  openCompose: (mode, replyToId) =>
    set({ composeOpen: true, composeMode: mode, composeReplyToEmailId: replyToId ?? null }),

  closeCompose: () =>
    set({ composeOpen: false, composeMode: null, composeReplyToEmailId: null }),
}));
```

### UI Store

```typescript
// packages/client/src/stores/ui-store.ts

import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  searchOpen: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;

  toggleSidebar: () => void;
  toggleSearch: () => void;
  toggleCommandPalette: () => void;
  toggleSettings: () => void;
  closeAll: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  searchOpen: false,
  commandPaletteOpen: false,
  settingsOpen: false,

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSearch: () => set(s => ({ searchOpen: !s.searchOpen, commandPaletteOpen: false })),
  toggleCommandPalette: () => set(s => ({ commandPaletteOpen: !s.commandPaletteOpen, searchOpen: false })),
  toggleSettings: () => set(s => ({ settingsOpen: !s.settingsOpen })),
  closeAll: () => set({ searchOpen: false, commandPaletteOpen: false, settingsOpen: false }),
}));
```

### Settings Store

```typescript
// packages/client/src/stores/settings-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Density = 'compact' | 'default' | 'comfortable';
type ReadingPane = 'right' | 'bottom' | 'hidden';
type AutoAdvance = 'next' | 'previous' | 'list';

interface SettingsState {
  theme: Theme;
  density: Density;
  readingPane: ReadingPane;
  autoAdvance: AutoAdvance;
  customShortcuts: Record<string, string>;

  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  setReadingPane: (pane: ReadingPane) => void;
  setAutoAdvance: (advance: AutoAdvance) => void;
  setCustomShortcut: (action: string, keys: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      density: 'default',
      readingPane: 'right',
      autoAdvance: 'next',
      customShortcuts: {},

      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setReadingPane: (pane) => set({ readingPane: pane }),
      setAutoAdvance: (advance) => set({ autoAdvance: advance }),
      setCustomShortcut: (action, keys) =>
        set(s => ({
          customShortcuts: { ...s.customShortcuts, [action]: keys },
        })),
    }),
    { name: 'atlasmail-settings' },
  ),
);
```

---

## 8.3 TanStack Query Usage

### Query key factory:

```typescript
// packages/client/src/config/query-keys.ts

export const queryKeys = {
  threads: {
    all: ['threads'] as const,
    list: (filters: { category?: string; label?: string }) =>
      ['threads', 'list', filters] as const,
    detail: (threadId: string) =>
      ['threads', 'detail', threadId] as const,
  },
  emails: {
    all: ['emails'] as const,
    detail: (emailId: string) =>
      ['emails', 'detail', emailId] as const,
  },
  search: {
    all: ['search'] as const,
    results: (query: string) =>
      ['search', 'results', query] as const,
  },
  drafts: {
    all: ['drafts'] as const,
    detail: (draftId: string) =>
      ['drafts', 'detail', draftId] as const,
  },
  sync: {
    status: ['sync', 'status'] as const,
  },
};
```

### Thread list hook with optimistic updates:

```typescript
// packages/client/src/hooks/use-threads.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';

export function useThreads(category?: string) {
  return useQuery({
    queryKey: queryKeys.threads.list({ category }),
    queryFn: async () => {
      const { data } = await apiClient.get('/threads', {
        params: { category, per_page: 50 },
      });
      return data.data;
    },
    staleTime: 30_000,          // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000,     // Keep in cache for 5 minutes
  });
}

export function useArchiveThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      await apiClient.post(`/threads/${threadId}/archive`);
    },

    // Optimistic update: remove thread from list immediately
    onMutate: async (threadId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.threads.all });

      // Snapshot current state for rollback
      const previousThreads = queryClient.getQueriesData({
        queryKey: queryKeys.threads.all,
      });

      // Optimistically remove the thread from all cached lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.threads.all },
        (old: any) => {
          if (!old) return old;
          return old.filter((t: any) => t.id !== threadId);
        },
      );

      return { previousThreads };
    },

    // Rollback on error
    onError: (_err, _threadId, context) => {
      if (context?.previousThreads) {
        for (const [queryKey, data] of context.previousThreads) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },

    // Always refetch after mutation settles
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      await apiClient.post(`/threads/${threadId}/read`);
    },
    onMutate: async (threadId) => {
      // Optimistically mark as read in cached data
      queryClient.setQueriesData(
        { queryKey: queryKeys.threads.all },
        (old: any) => {
          if (!old) return old;
          return old.map((t: any) =>
            t.id === threadId ? { ...t, unread_count: 0 } : t
          );
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}
```

---

## 8.4 Data Flow Summary

### Web app:
```
User Action → Zustand (optimistic UI) → TanStack Query (API call)
                                            → Server → Gmail API
                                            → Server → PostgreSQL
                                            → Response
                                         → TanStack Query cache update
                                         → React re-render
```

### Electron app:
```
User Action → Zustand (optimistic UI) → IPC to main process
                                            → SQLite (immediate write)
                                            → Gmail API (background)
                                         → IPC response to renderer
                                         → TanStack Query cache invalidation
                                         → React re-render
```

### Key difference: In Electron, the local SQLite database is the source of
truth. Reads come from SQLite. Writes go to SQLite first, then sync to Gmail.
In the web app, the server (PostgreSQL) is the source of truth.
