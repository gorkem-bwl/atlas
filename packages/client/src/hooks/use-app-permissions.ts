import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';

export type AppRole = 'admin' | 'editor' | 'viewer';
export type AppRecordAccess = 'all' | 'own';

export interface AppPermission {
  role: AppRole;
  recordAccess: AppRecordAccess;
}

export interface AppPermissionWithUser {
  id: string | null;
  accountId: string;
  userId: string;
  role: AppRole;
  recordAccess: AppRecordAccess;
  userName: string | null;
  userEmail: string;
  createdAt: string | null;
  updatedAt: string | null;
}

// ─── My permission (existing) ──────────────────────────────────────

export function useMyAppPermission(appId: string) {
  return useQuery({
    queryKey: queryKeys.permissions.me(appId),
    queryFn: async () => {
      const { data } = await api.get(`/permissions/${appId}/me`);
      return data.data as AppPermission;
    },
    staleTime: 60_000,
  });
}

// ─── All permissions for an app ────────────────────────────────────

export function useAppPermissions(appId: string) {
  return useQuery({
    queryKey: queryKeys.permissions.app(appId),
    queryFn: async () => {
      const { data } = await api.get(`/permissions/${appId}`);
      return data.data as { permissions: AppPermissionWithUser[] };
    },
    staleTime: 30_000,
  });
}

// ─── Update a user's permission ────────────────────────────────────

export function useUpdateAppPermission(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      role,
      recordAccess,
    }: {
      userId: string;
      role: AppRole;
      recordAccess: AppRecordAccess;
    }) => {
      const { data } = await api.put(`/permissions/${appId}/${userId}`, { role, recordAccess });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.app(appId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.me(appId) });
    },
  });
}

// ─── Delete (reset) a user's permission ────────────────────────────

export function useDeleteAppPermission(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.delete(`/permissions/${appId}/${userId}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.app(appId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.me(appId) });
    },
  });
}
