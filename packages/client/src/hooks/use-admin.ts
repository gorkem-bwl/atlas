import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';

// ─── Overview ───────────────────────────────────────────────────────────────

export function useAdminOverview() {
  return useQuery({
    queryKey: queryKeys.admin.overview,
    queryFn: async () => {
      const { data } = await api.get('/admin/overview');
      return data.data as {
        tenants: number;
      };
    },
    refetchInterval: 30_000,
  });
}

// ─── Tenants ────────────────────────────────────────────────────────────────

export interface AdminTenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  ownerId: string;
  k8sNamespace: string;
  quotaCpu: number;
  quotaMemoryMb: number;
  quotaStorageMb: number;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

export function useAdminTenants() {
  return useQuery({
    queryKey: queryKeys.admin.tenants,
    queryFn: async () => {
      const { data } = await api.get('/admin/tenants');
      return data.data as AdminTenant[];
    },
  });
}

export interface AdminTenantDetail extends Omit<AdminTenant, 'memberCount'> {
  members: Array<{ tenantId: string; userId: string; role: string; createdAt: string }>;
}

export function useAdminTenant(id: string) {
  return useQuery({
    queryKey: queryKeys.admin.tenant(id),
    queryFn: async () => {
      const { data } = await api.get(`/admin/tenants/${id}`);
      return data.data as AdminTenantDetail;
    },
    enabled: !!id,
  });
}

export function useUpdateTenantStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.put(`/admin/tenants/${id}/status`, { status });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.tenants });
    },
  });
}

export function useUpdateTenantPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const { data } = await api.put(`/admin/tenants/${id}/plan`, { plan });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.tenants });
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; slug: string; ownerName?: string; ownerPassword?: string }) => {
      const { data } = await api.post('/admin/tenants', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.tenants });
      qc.invalidateQueries({ queryKey: queryKeys.admin.overview });
    },
  });
}
