import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { DriveItem, UpdateDriveItemInput } from '@atlasmail/shared';

// ─── Queries ─────────────────────────────────────────────────────────

interface ListItemsResponse {
  items: DriveItem[];
}

interface BreadcrumbsResponse {
  breadcrumbs: Array<{ id: string; name: string }>;
}

interface FoldersResponse {
  folders: Array<{ id: string; name: string; parentId: string | null }>;
}

export function useDriveItems(parentId?: string | null, sortBy?: string) {
  return useQuery({
    queryKey: [...queryKeys.drive.items(parentId), sortBy] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (parentId) params.set('parentId', parentId);
      if (sortBy && sortBy !== 'default') params.set('sortBy', sortBy);
      const qs = params.toString();
      const { data } = await api.get(`/drive${qs ? `?${qs}` : ''}`);
      return data.data as ListItemsResponse;
    },
    staleTime: 30_000,
  });
}

export function useDriveItem(itemId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.drive.detail(itemId!),
    queryFn: async () => {
      const { data } = await api.get(`/drive/${itemId}`);
      return data.data as DriveItem;
    },
    enabled: !!itemId,
    staleTime: 10_000,
  });
}

export function useDriveBreadcrumbs(itemId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.drive.breadcrumbs(itemId!),
    queryFn: async () => {
      const { data } = await api.get(`/drive/${itemId}/breadcrumbs`);
      return data.data as BreadcrumbsResponse;
    },
    enabled: !!itemId,
    staleTime: 30_000,
  });
}

export function useDriveFavourites() {
  return useQuery({
    queryKey: queryKeys.drive.favourites,
    queryFn: async () => {
      const { data } = await api.get('/drive/favourites');
      return data.data as ListItemsResponse;
    },
    staleTime: 30_000,
  });
}

export function useDriveRecent() {
  return useQuery({
    queryKey: queryKeys.drive.recent,
    queryFn: async () => {
      const { data } = await api.get('/drive/recent');
      return data.data as ListItemsResponse;
    },
    staleTime: 30_000,
  });
}

export function useDriveTrash() {
  return useQuery({
    queryKey: queryKeys.drive.trash,
    queryFn: async () => {
      const { data } = await api.get('/drive/trash');
      return data.data as ListItemsResponse;
    },
    staleTime: 30_000,
  });
}

export function useDriveSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.drive.search(query),
    queryFn: async () => {
      const { data } = await api.get(`/drive/search?q=${encodeURIComponent(query)}`);
      return data.data as ListItemsResponse;
    },
    enabled: query.trim().length > 0,
    staleTime: 10_000,
  });
}

export function useDriveFolders() {
  return useQuery({
    queryKey: queryKeys.drive.folders,
    queryFn: async () => {
      const { data } = await api.get('/drive/folders');
      return data.data as FoldersResponse;
    },
    staleTime: 30_000,
  });
}

export function useDriveStorage() {
  return useQuery({
    queryKey: queryKeys.drive.storage,
    queryFn: async () => {
      const { data } = await api.get('/drive/storage');
      return data.data as { totalBytes: number };
    },
    staleTime: 60_000,
  });
}

interface FilePreviewResponse {
  content: string;
  truncated: boolean;
  totalSize: number;
  mimeType: string | null;
  name: string;
}

export function useFilePreview(itemId: string | undefined) {
  return useQuery({
    queryKey: ['drive', 'preview', itemId] as const,
    queryFn: async () => {
      const { data } = await api.get(`/drive/${itemId}/preview`);
      return data.data as FilePreviewResponse;
    },
    enabled: !!itemId,
    staleTime: 60_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; parentId?: string | null }) => {
      const { data } = await api.post('/drive/folder', input);
      return data.data as DriveItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function useUploadFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      parentId,
      onProgress,
    }: {
      files: File[];
      parentId?: string | null;
      onProgress?: (progress: { loaded: number; total: number }) => void;
    }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      if (parentId) formData.append('parentId', parentId);

      const { data } = await api.post('/drive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            onProgress({ loaded: progressEvent.loaded, total: progressEvent.total });
          }
        },
      });
      return data.data as { items: DriveItem[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function useUpdateDriveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateDriveItemInput & { id: string }) => {
      const { data } = await api.patch(`/drive/${id}`, input);
      return data.data as DriveItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function useDeleteDriveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/drive/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function useRestoreDriveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/drive/${id}/restore`);
      return data.data as DriveItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function usePermanentDeleteDriveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/drive/${id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function useDuplicateDriveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/drive/${id}/duplicate`);
      return data.data as DriveItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function useBatchDeleteDriveItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemIds: string[]) => {
      await api.post('/drive/batch/delete', { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function useBatchMoveDriveItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemIds, parentId }: { itemIds: string[]; parentId: string | null }) => {
      await api.post('/drive/batch/move', { itemIds, parentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function useBatchFavouriteDriveItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemIds, isFavourite }: { itemIds: string[]; isFavourite: boolean }) => {
      await api.post('/drive/batch/favourite', { itemIds, isFavourite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}
