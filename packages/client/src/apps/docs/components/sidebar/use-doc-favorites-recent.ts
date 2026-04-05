import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api-client';
import { queryKeys } from '../../../../config/query-keys';

// ─── Server-backed helpers for favorites & recently viewed ──────────────

const MAX_RECENT = 10;

export function useDocFavoritesAndRecent() {
  const queryClient = useQueryClient();

  const { data: serverSettings } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as Record<string, unknown> | null;
    },
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { data } = await api.put('/settings', patch);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });

  const favorites: string[] = Array.isArray(serverSettings?.docFavorites)
    ? serverSettings.docFavorites as string[]
    : [];

  const recent: string[] = Array.isArray(serverSettings?.docRecent)
    ? serverSettings.docRecent as string[]
    : [];

  const setFavorites = (ids: string[]) => {
    queryClient.setQueryData(queryKeys.settings.all, (old: Record<string, unknown> | null | undefined) => ({
      ...(old ?? {}),
      docFavorites: ids,
    }));
    mutation.mutate({ docFavorites: ids });
  };

  const addRecentlyViewed = (id: string) => {
    const next = [id, ...recent.filter((r) => r !== id)].slice(0, MAX_RECENT);
    queryClient.setQueryData(queryKeys.settings.all, (old: Record<string, unknown> | null | undefined) => ({
      ...(old ?? {}),
      docRecent: next,
    }));
    mutation.mutate({ docRecent: next });
  };

  return { favorites, recent, setFavorites, addRecentlyViewed };
}
