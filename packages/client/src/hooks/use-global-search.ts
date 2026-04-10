import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { GlobalSearchResult } from '@atlas-platform/shared';

function useDebounce(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useGlobalSearch(query: string) {
  const debounced = useDebounce(query.trim());
  return useQuery({
    queryKey: queryKeys.search.global(debounced),
    queryFn: async () => {
      const { data } = await api.get('/search', { params: { q: debounced } });
      return data.data as GlobalSearchResult[];
    },
    enabled: debounced.length >= 2,
    staleTime: 10_000,
  });
}
