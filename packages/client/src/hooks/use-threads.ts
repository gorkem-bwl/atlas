import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import { getMockThreads, getMockThread } from '../lib/mock-data';
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
