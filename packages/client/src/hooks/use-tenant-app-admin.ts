import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export function useTenantAppsAdmin(tenantId: string) {
  return useQuery({
    queryKey: ['admin', 'tenant-apps', tenantId],
    queryFn: async () => {
      const { data } = await api.get(`/platform/tenants/${tenantId}/apps`);
      return data.data.apps as Array<{
        id: string;
        appId: string;
        isEnabled: boolean;
        enabledAt: string;
        enabledBy: string;
      }>;
    },
    enabled: !!tenantId,
  });
}

export function useToggleTenantApp(tenantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ appId, enable }: { appId: string; enable: boolean }) => {
      const action = enable ? 'enable' : 'disable';
      const { data } = await api.post(`/platform/tenants/${tenantId}/apps/${appId}/${action}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tenant-apps', tenantId] });
    },
  });
}
