import { create } from 'zustand';
import type { EmailCategory } from '@atlasmail/shared';

interface EmailState {
  activeCategory: EmailCategory;
  activeThreadId: string | null;
  cursorIndex: number;
  selectedThreadIds: Set<string>;
  composeMode: 'new' | 'reply' | 'reply_all' | 'forward' | null;
  composeThreadId: string | null;
  setActiveCategory: (category: EmailCategory) => void;
  setActiveThread: (id: string | null) => void;
  moveCursor: (delta: number, max: number) => void;
  setCursorIndex: (index: number) => void;
  toggleSelection: (threadId: string) => void;
  clearSelection: () => void;
  openCompose: (mode: 'new' | 'reply' | 'reply_all' | 'forward', threadId?: string) => void;
  closeCompose: () => void;
}

export const useEmailStore = create<EmailState>((set) => ({
  activeCategory: 'important',
  activeThreadId: null,
  cursorIndex: 0,
  selectedThreadIds: new Set(),
  composeMode: null,
  composeThreadId: null,
  setActiveCategory: (category) => set({ activeCategory: category, cursorIndex: 0 }),
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
  openCompose: (mode, threadId) => set({ composeMode: mode, composeThreadId: threadId || null }),
  closeCompose: () => set({ composeMode: null, composeThreadId: null }),
}));
