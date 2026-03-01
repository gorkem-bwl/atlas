import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { CatalogApp, Tenant, AppInstallation, InstallAppInput, CreateTenantInput } from '@atlasmail/shared';

// ─── Catalog ─────────────────────────────────────────────────────────

export function useCatalog(category?: string) {
  return useQuery({
    queryKey: queryKeys.platform.catalog(category),
    queryFn: async () => {
      const params = category ? `?category=${category}` : '';
      const { data } = await api.get(`/platform/catalog${params}`);
      return data.data.apps as CatalogApp[];
    },
    staleTime: 60_000,
  });
}

export function useCatalogApp(manifestId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.platform.catalogApp(manifestId!),
    queryFn: async () => {
      const { data } = await api.get(`/platform/catalog/${manifestId}`);
      return data.data as CatalogApp;
    },
    enabled: !!manifestId,
    staleTime: 60_000,
  });
}

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

// ─── Installations ──────────────────────────────────────────────────

export function useInstallations(tenantId: string | undefined, refetchInterval = 15_000) {
  return useQuery({
    queryKey: queryKeys.platform.installations(tenantId!),
    queryFn: async () => {
      const { data } = await api.get(`/platform/tenants/${tenantId}/installations`);
      return data.data.installations as AppInstallation[];
    },
    enabled: !!tenantId,
    staleTime: 10_000,
    refetchInterval,
  });
}

export function useInstallApp(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InstallAppInput) => {
      const { data } = await api.post(`/platform/tenants/${tenantId}/installations`, input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.installations(tenantId) });
    },
  });
}

export function useStartApp(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (installationId: string) => {
      const { data } = await api.post(`/platform/tenants/${tenantId}/installations/${installationId}/start`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.installations(tenantId) });
    },
  });
}

export function useStopApp(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (installationId: string) => {
      const { data } = await api.post(`/platform/tenants/${tenantId}/installations/${installationId}/stop`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.installations(tenantId) });
    },
  });
}

export function useUninstallApp(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (installationId: string) => {
      const { data } = await api.delete(`/platform/tenants/${tenantId}/installations/${installationId}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platform.installations(tenantId) });
    },
  });
}
