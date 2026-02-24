import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { Thread } from '@atlasmail/shared';

export function useSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.search.results(query),
    queryFn: async () => {
      const { data } = await api.get('/search', { params: { q: query } });
      return data.data as Thread[];
    },
    enabled: query.length > 0,
  });
}
