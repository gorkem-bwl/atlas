import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  sourceType: string | null;
  sourceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  appId: string;
  eventType: string;
  title: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Notification hooks
// ---------------------------------------------------------------------------

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: async () => {
      const { data } = await api.get('/notifications?limit=30');
      return data as { items: Notification[]; unreadCount: number };
    },
    staleTime: 15_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data as { count: number };
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Activity feed hooks
// ---------------------------------------------------------------------------

export function useActivityFeed(page?: number) {
  return useQuery({
    queryKey: queryKeys.activityFeed.list(page),
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' });
      if (page != null) params.set('page', String(page));
      const { data } = await api.get(`/activity-feed?${params.toString()}`);
      return data as { items: ActivityItem[]; hasMore: boolean };
    },
    staleTime: 30_000,
  });
}
