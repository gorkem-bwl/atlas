import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { CustomFieldWithValue } from '@atlasmail/shared';

/**
 * Fetch custom field definitions + current values for a specific record.
 */
export function useCustomFieldValues(appId: string, recordType: string, recordId: string) {
  return useQuery({
    queryKey: queryKeys.customFields.values(appId, recordType, recordId),
    queryFn: async () => {
      const { data } = await api.get(`/custom-field-values/${appId}/${recordType}/${recordId}`);
      return data.data as CustomFieldWithValue[];
    },
    enabled: !!appId && !!recordType && !!recordId,
    staleTime: 30_000,
  });
}

/**
 * Save custom field values for a record (bulk upsert).
 */
export function useSaveCustomFieldValues(appId: string, recordType: string, recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Array<{ fieldDefinitionId: string; value: unknown }>) => {
      await api.put(`/custom-field-values/${recordId}`, { values });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customFields.values(appId, recordType, recordId),
      });
    },
  });
}
