import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { LinkCount, LinkedRecord } from '@atlas-platform/shared';

export function useLinkCounts(appId: string | undefined, recordId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.links.counts(appId!, recordId!),
    queryFn: async () => {
      const { data } = await api.get(`/links/${appId}/${recordId}/counts`);
      return data.data as LinkCount[];
    },
    enabled: !!appId && !!recordId,
    staleTime: 30_000,
  });
}

export function useLinkedRecords(appId: string | undefined, recordId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.links.details(appId!, recordId!),
    queryFn: async () => {
      const { data } = await api.get(`/links/${appId}/${recordId}/details`);
      return data.data as LinkedRecord[];
    },
    enabled: !!appId && !!recordId,
    staleTime: 30_000,
  });
}

export function useCreateLink(sourceAppId: string, sourceRecordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { targetAppId: string; targetRecordId: string; linkType?: string }) => {
      const { data } = await api.post('/links', {
        sourceAppId,
        sourceRecordId,
        targetAppId: input.targetAppId,
        targetRecordId: input.targetRecordId,
        linkType: input.linkType,
      });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.links.counts(sourceAppId, sourceRecordId) });
      qc.invalidateQueries({ queryKey: queryKeys.links.details(sourceAppId, sourceRecordId) });
    },
  });
}

export function useDeleteLink(appId: string, recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: string) => {
      await api.delete(`/links/${linkId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.links.counts(appId, recordId) });
      qc.invalidateQueries({ queryKey: queryKeys.links.details(appId, recordId) });
    },
  });
}
