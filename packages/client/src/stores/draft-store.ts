import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Recipient } from '../lib/mock-contacts';

// ─── Types ─────────────────────────────────────────────────────────────

export interface Draft {
  id: string;
  composeMode: 'new' | 'reply' | 'reply_all' | 'forward';
  threadId: string | null;
  toRecipients: Recipient[];
  ccRecipients: Recipient[];
  bccRecipients: Recipient[];
  subject: string;
  bodyHtml: string;
  savedAt: string; // ISO timestamp
}

interface DraftState {
  drafts: Draft[];
  activeDraftId: string | null;
  saveDraft: (draft: Omit<Draft, 'id' | 'savedAt'>) => string;
  updateDraft: (id: string, updates: Partial<Draft>) => void;
  deleteDraft: (id: string) => void;
  getDraft: (id: string) => Draft | undefined;
  setActiveDraftId: (id: string | null) => void;
}

// ─── Store ─────────────────────────────────────────────────────────────

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: [],
      activeDraftId: null,

      saveDraft: (draftData) => {
        const id = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const draft: Draft = {
          ...draftData,
          id,
          savedAt: new Date().toISOString(),
        };
        set((state) => ({ drafts: [...state.drafts, draft] }));
        return id;
      },

      updateDraft: (id, updates) => {
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.id === id ? { ...d, ...updates, savedAt: new Date().toISOString() } : d,
          ),
        }));
      },

      deleteDraft: (id) => {
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== id),
          activeDraftId: state.activeDraftId === id ? null : state.activeDraftId,
        }));
      },

      getDraft: (id) => {
        return get().drafts.find((d) => d.id === id);
      },

      setActiveDraftId: (id) => {
        set({ activeDraftId: id });
      },
    }),
    {
      name: 'atlasmail_drafts',
      // Only persist the drafts array — activeDraftId is session-only
      partialize: (state) => ({ drafts: state.drafts }),
    },
  ),
);
