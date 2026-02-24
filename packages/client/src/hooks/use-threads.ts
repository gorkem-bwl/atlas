import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import { getMockThreads, getMockThread } from '../lib/mock-data';
import { useToastStore } from '../stores/toast-store';
import type { Thread } from '@atlasmail/shared';

const USE_MOCK = import.meta.env.DEV && !import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function useThreads(category?: string) {
  return useQuery({
    queryKey: queryKeys.threads.list(category),
    queryFn: async () => {
      if (USE_MOCK) return getMockThreads(category);
      const { data } = await api.get('/threads', { params: { category } });
      return data.data as Thread[];
    },
  });
}

export function useThread(id: string | null) {
  return useQuery({
    queryKey: queryKeys.threads.detail(id!),
    queryFn: async () => {
      if (USE_MOCK) return getMockThread(id!);
      const { data } = await api.get(`/threads/${id}`);
      return data.data as Thread;
    },
    enabled: !!id,
  });
}

export function useArchiveThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      if (USE_MOCK) return;
      await api.post(`/threads/${threadId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}

export function useTrashThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      if (USE_MOCK) return;
      await api.post(`/threads/${threadId}/trash`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}

// ─── Undo-aware archive ───────────────────────────────────────────────
//
// Pattern:
//   1. Optimistically remove the thread from the TanStack Query cache.
//   2. Show an undo toast with a countdown.
//   3a. Undo clicked  → restore the thread in the cache (no API call).
//   3b. Timer expires → call the real archive API, then invalidate.

export function useArchiveWithUndo() {
  const queryClient = useQueryClient();
  const archiveMutation = useArchiveThread();
  const { addToast } = useToastStore();

  return useCallback(
    (threadId: string, category?: string) => {
      // Snapshot the current list so we can restore it on undo
      const listKey = queryKeys.threads.list(category);
      const previousThreads = queryClient.getQueryData<Thread[]>(listKey);

      // Optimistically remove the thread
      queryClient.setQueryData<Thread[]>(listKey, (old) =>
        (old ?? []).filter((t) => t.id !== threadId),
      );

      addToast({
        type: 'undo',
        message: 'Conversation archived',
        duration: 5000,
        undoAction: () => {
          // Restore the original list in the cache
          queryClient.setQueryData<Thread[]>(listKey, previousThreads);
        },
        commitAction: () => {
          // Timer expired — fire the real mutation
          archiveMutation.mutate(threadId);
        },
      });
    },
    [queryClient, archiveMutation, addToast],
  );
}

// ─── Undo-aware trash ─────────────────────────────────────────────────

export function useTrashWithUndo() {
  const queryClient = useQueryClient();
  const trashMutation = useTrashThread();
  const { addToast } = useToastStore();

  return useCallback(
    (threadId: string, category?: string) => {
      const listKey = queryKeys.threads.list(category);
      const previousThreads = queryClient.getQueryData<Thread[]>(listKey);

      queryClient.setQueryData<Thread[]>(listKey, (old) =>
        (old ?? []).filter((t) => t.id !== threadId),
      );

      addToast({
        type: 'undo',
        message: 'Conversation moved to trash',
        duration: 5000,
        undoAction: () => {
          queryClient.setQueryData<Thread[]>(listKey, previousThreads);
        },
        commitAction: () => {
          trashMutation.mutate(threadId);
        },
      });
    },
    [queryClient, trashMutation, addToast],
  );
}

export function useToggleStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      if (USE_MOCK) return;
      await api.post(`/threads/${threadId}/star`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}

export function useSnoozeThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, snoozeUntil }: { threadId: string; snoozeUntil: string }) => {
      if (USE_MOCK) return;
      await api.post(`/threads/${threadId}/snooze`, { snoozeUntil });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}
