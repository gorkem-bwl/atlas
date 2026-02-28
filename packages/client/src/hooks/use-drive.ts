import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type { DriveItem, CreateDriveItemInput, UpdateDriveItemInput } from '@atlasmail/shared';

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

export function useDriveItems(parentId?: string | null) {
  return useQuery({
    queryKey: queryKeys.drive.items(parentId),
    queryFn: async () => {
      const params = parentId ? `?parentId=${parentId}` : '';
      const { data } = await api.get(`/drive${params}`);
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
    mutationFn: async ({ files, parentId }: { files: File[]; parentId?: string | null }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      if (parentId) formData.append('parentId', parentId);

      const { data } = await api.post('/drive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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

// ─── Linked resource mutations ───────────────────────────────────────

export function useCreateLinkedDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { parentId?: string | null }) => {
      const { data } = await api.post('/drive/create-document', input);
      return data.data as { driveItem: DriveItem; resourceId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function useCreateLinkedDrawing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { parentId?: string | null }) => {
      const { data } = await api.post('/drive/create-drawing', input);
      return data.data as { driveItem: DriveItem; resourceId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}

export function useCreateLinkedSpreadsheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { parentId?: string | null }) => {
      const { data } = await api.post('/drive/create-spreadsheet', input);
      return data.data as { driveItem: DriveItem; resourceId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all });
    },
  });
}
