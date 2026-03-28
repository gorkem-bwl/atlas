import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { Tenant, CreateTenantInput, TenantUser, CreateTenantUserInput, TenantMemberRole } from '@atlasmail/shared';

// ─── Tenants ─────────────────────────────────────────────────────────

export function useMyTenants() {
  return useQuery({
    queryKey: queryKeys.platform.tenants,
    queryFn: async () => {
      const { data } = await api.get('/platform/tenants');
      return data.data.tenants as (Tenant & { role: string })[];
    },
    staleTime: 30_000,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      const { data } = await api.post('/platform/tenants', input);
      return data.data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.all });
    },
  });
}

// ─── Tenant Users ───────────────────────────────────────────────────

export function useTenantUsers(tenantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.platform.tenantUsers(tenantId!),
    queryFn: async () => {
      const { data } = await api.get(`/platform/tenants/${tenantId}/users`);
      return data.data.users as TenantUser[];
    },
    enabled: !!tenantId,
    staleTime: 10_000,
  });
}

export function useCreateTenantUser(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTenantUserInput) => {
      const { data } = await api.post(`/platform/tenants/${tenantId}/users`, input);
      return data.data as TenantUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenantUsers(tenantId) });
    },
  });
}

export function useRemoveTenantUser(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/platform/tenants/${tenantId}/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenantUsers(tenantId) });
    },
  });
}

export function useUpdateTenantUserRole(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; role: TenantMemberRole }) => {
      await api.put(`/platform/tenants/${tenantId}/users/${input.userId}/role`, { role: input.role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenantUsers(tenantId) });
    },
  });
}

export function useInviteTenantUser(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role?: TenantMemberRole }) => {
      const { data } = await api.post(`/platform/tenants/${tenantId}/invitations`, input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.tenantUsers(tenantId) });
    },
  });
}
