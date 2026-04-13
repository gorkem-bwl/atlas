import { create } from 'zustand';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { CONFLICT_DISMISSED } from '@atlas-platform/shared';

export interface PendingConflict {
  request: AxiosRequestConfig;
  currentUpdatedAt: string;
  resolve: (value: AxiosResponse) => void;
  reject: (error: unknown) => void;
}

interface ConflictState {
  open: boolean;
  pending: PendingConflict | null;
  openConflict: (
    request: AxiosRequestConfig,
    currentUpdatedAt: string,
    resolve: (value: AxiosResponse) => void,
    reject: (error: unknown) => void,
  ) => void;
  close: () => void;
}

export const useConflictStore = create<ConflictState>((set, get) => ({
  open: false,
  pending: null,

  openConflict: (request, currentUpdatedAt, resolve, reject) => {
    // If a conflict was already pending (e.g. two concurrent 409s race in),
    // settle the previous one so its promise doesn't leak.
    const previous = get().pending;
    if (previous) {
      previous.reject({ code: CONFLICT_DISMISSED });
    }
    set({
      open: true,
      pending: { request, currentUpdatedAt, resolve, reject },
    });
  },

  close: () => {
    const pending = get().pending;
    if (pending) {
      pending.reject({ code: CONFLICT_DISMISSED });
    }
    set({ open: false, pending: null });
  },
}));
