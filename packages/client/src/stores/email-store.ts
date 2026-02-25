import { create } from 'zustand';
import type { EmailCategory } from '@atlasmail/shared';

export type Mailbox = 'inbox' | 'starred' | 'unread' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam';

interface EmailState {
  activeCategory: EmailCategory;
  activeMailbox: Mailbox;
  activeThreadId: string | null;
  cursorIndex: number;
  selectedThreadIds: Set<string>;
  composeMode: 'new' | 'reply' | 'reply_all' | 'forward' | null;
  composeThreadId: string | null;
  filterByLabel: string | null;
  setActiveCategory: (category: EmailCategory) => void;
  setActiveMailbox: (mailbox: Mailbox) => void;
  setActiveThread: (id: string | null) => void;
  moveCursor: (delta: number, max: number) => void;
  setCursorIndex: (index: number) => void;
  toggleSelection: (threadId: string) => void;
  clearSelection: () => void;
  selectThreads: (threadIds: string[]) => void;
  openCompose: (mode: 'new' | 'reply' | 'reply_all' | 'forward', threadId?: string) => void;
  closeCompose: () => void;
  setFilterByLabel: (labelId: string | null) => void;
}

export const useEmailStore = create<EmailState>((set) => ({
  activeCategory: 'all',
  activeMailbox: 'inbox',
  activeThreadId: null,
  cursorIndex: 0,
  selectedThreadIds: new Set(),
  composeMode: null,
  composeThreadId: null,
  filterByLabel: null,
  setActiveCategory: (category) =>
    set({ activeCategory: category, activeMailbox: 'inbox', cursorIndex: 0 }),
  setActiveMailbox: (mailbox) =>
    set({
      activeMailbox: mailbox,
      activeThreadId: null,
      cursorIndex: 0,
      selectedThreadIds: new Set(),
    }),
  setActiveThread: (id) => set({ activeThreadId: id }),
  moveCursor: (delta, max) =>
    set((state) => ({ cursorIndex: Math.max(0, Math.min(max, state.cursorIndex + delta)) })),
  setCursorIndex: (index) => set({ cursorIndex: index }),
  toggleSelection: (threadId) =>
    set((state) => {
      const next = new Set(state.selectedThreadIds);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return { selectedThreadIds: next };
    }),
  clearSelection: () => set({ selectedThreadIds: new Set() }),
  selectThreads: (threadIds) => set({ selectedThreadIds: new Set(threadIds) }),
  openCompose: (mode, threadId) => set({ composeMode: mode, composeThreadId: threadId ?? null }),
  closeCompose: () => set({ composeMode: null, composeThreadId: null }),
  setFilterByLabel: (labelId) => set({ filterByLabel: labelId }),
}));
