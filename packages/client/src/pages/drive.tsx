import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Upload, FolderPlus, ArrowLeft, Trash2, RotateCcw,
  Star, MoreHorizontal, Pencil, Download, FolderInput, ChevronRight,
  LayoutGrid, LayoutList, Home, Clock, Heart, HardDrive, Upload as UploadIcon,
  Copy, X, Check, ChevronDown, Tag, FileArchive,
} from 'lucide-react';
import {
  useDriveItems, useDriveBreadcrumbs, useDriveFavourites, useDriveRecent,
  useDriveTrash, useDriveSearch, useCreateFolder, useUploadFiles,
  useUpdateDriveItem, useDeleteDriveItem, useRestoreDriveItem,
  usePermanentDeleteDriveItem, useDriveStorage, useDriveFolders,
  useDuplicateDriveItem, useBatchDeleteDriveItems, useBatchMoveDriveItems,
  useBatchFavouriteDriveItems, useFilePreview,
} from '../hooks/use-drive';
import { useToastStore } from '../stores/toast-store';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '../components/ui/context-menu';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Modal } from '../components/ui/modal';
import { Chip } from '../components/ui/chip';
import { EmojiPicker } from '../components/shared/emoji-picker';
import { getFileIcon, getFileIconColor, formatBytes, formatRelativeDate, isImageFile } from '../lib/drive-utils';
import { ROUTES } from '../config/routes';
import type { DriveItem } from '@atlasmail/shared';
import '../styles/drive.css';

// ─── Constants ───────────────────────────────────────────────────────

const SIDEBAR_WIDTH_KEY = 'atlasmail_drive_sidebar_width';
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const VIEW_MODE_KEY = 'atlasmail_drive_view_mode';

type ViewMode = 'list' | 'grid';
type SidebarView = 'files' | 'favourites' | 'recent' | 'trash';
type SortBy = 'default' | 'name' | 'size' | 'date' | 'type';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'date', label: 'Date modified' },
  { value: 'type', label: 'Type' },
];

const TAG_COLORS = [
  { name: 'red', hex: '#ef4444' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'orange', hex: '#f97316' },
  { name: 'purple', hex: '#8b5cf6' },
  { name: 'gray', hex: '#6b7280' },
];

function getSavedSidebarWidth(): number {
  try {
    const w = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) || '', 10);
    if (w >= MIN_SIDEBAR_WIDTH && w <= MAX_SIDEBAR_WIDTH) return w;
  } catch { /* ignore */ }
  return DEFAULT_SIDEBAR_WIDTH;
}

function getSavedViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY);
    if (v === 'list' || v === 'grid') return v;
  } catch { /* ignore */ }
  return 'list';
}

function getTokenParam(): string {
  const token = localStorage.getItem('atlasmail_token');
  return token ? `?token=${encodeURIComponent(token)}` : '';
}

function parseTag(tag: string): { color: string; label: string } {
  const idx = tag.indexOf(':');
  if (idx > 0) return { color: tag.slice(0, idx), label: tag.slice(idx + 1) };
  return { color: '#6b7280', label: tag };
}

function isTextPreviewable(mimeType: string | null, name: string): boolean {
  if (!mimeType && !name) return false;
  if (mimeType) {
    if (mimeType.startsWith('text/')) return true;
    if (['application/json', 'application/xml', 'application/javascript', 'application/csv', 'application/x-yaml'].some((m) => mimeType.includes(m))) return true;
  }
  const ext = name.split('.').pop()?.toLowerCase();
  return ['csv', 'md', 'json', 'txt', 'xml', 'yaml', 'yml', 'sh', 'js', 'ts', 'html', 'css', 'log', 'ini', 'toml', 'sql'].includes(ext || '');
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

function parseCsvToRows(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    // Simple CSV parsing — handles quoted fields
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(current.trim()); current = ''; }
        else current += ch;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

// ─── Drive page ──────────────────────────────────────────────────────

export function DrivePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: folderId } = useParams<{ id: string }>();
  const addToast = useToastStore((s) => s.addToast);

  // State
  const [sidebarWidth, setSidebarWidth] = useState(getSavedSidebarWidth);
  const [viewMode, setViewMode] = useState<ViewMode>(getSavedViewMode);
  const [sidebarView, setSidebarView] = useState<SidebarView>('files');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: DriveItem } | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<DriveItem | null>(null);
  const [confirmPermanent, setConfirmPermanent] = useState<DriveItem | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<DriveItem | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('default');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [tagModalItem, setTagModalItem] = useState<DriveItem | null>(null);
  const [tagLabel, setTagLabel] = useState('');
  const [tagColor, setTagColor] = useState(TAG_COLORS[0].hex);
  const [iconPickerItem, setIconPickerItem] = useState<DriveItem | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [batchMoveOpen, setBatchMoveOpen] = useState(false);
  const [batchMoveTargetId, setBatchMoveTargetId] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizingRef = useRef(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Queries
  const currentParentId = folderId || null;
  const { data: itemsData, isLoading: itemsLoading } = useDriveItems(sidebarView === 'files' ? currentParentId : undefined, sortBy);
  const { data: breadcrumbsData } = useDriveBreadcrumbs(folderId);
  const { data: favouritesData } = useDriveFavourites();
  const { data: recentData } = useDriveRecent();
  const { data: trashData } = useDriveTrash();
  const { data: searchData } = useDriveSearch(searchQuery);
  const { data: storageData } = useDriveStorage();
  const { data: foldersData } = useDriveFolders();
  const previewFileId = previewItem && previewItem.type === 'file' && isTextPreviewable(previewItem.mimeType, previewItem.name) ? previewItem.id : undefined;
  const { data: filePreviewData, isLoading: previewLoading } = useFilePreview(previewFileId);

  // Mutations
  const createFolder = useCreateFolder();
  const uploadFiles = useUploadFiles();
  const updateItem = useUpdateDriveItem();
  const deleteItem = useDeleteDriveItem();
  const restoreItem = useRestoreDriveItem();
  const permanentDelete = usePermanentDeleteDriveItem();
  const duplicateItem = useDuplicateDriveItem();
  const batchDelete = useBatchDeleteDriveItems();
  const batchMove = useBatchMoveDriveItems();
  const batchFavourite = useBatchFavouriteDriveItems();

  // Determine which items to show
  const displayItems = useMemo(() => {
    if (searchQuery.trim()) return searchData?.items ?? [];
    if (sidebarView === 'favourites') return favouritesData?.items ?? [];
    if (sidebarView === 'recent') return recentData?.items ?? [];
    if (sidebarView === 'trash') return trashData?.items ?? [];
    return itemsData?.items ?? [];
  }, [sidebarView, searchQuery, itemsData, favouritesData, recentData, trashData, searchData]);

  const isLoading = sidebarView === 'files' && itemsLoading;
  const breadcrumbs = breadcrumbsData?.breadcrumbs ?? [];
  const hasSelection = selectedIds.size > 0;

  // Save view mode
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Close sort dropdown on click outside
  useEffect(() => {
    if (!sortDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortDropdownOpen]);

  // Close preview on Escape
  useEffect(() => {
    if (!previewItem) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewItem(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [previewItem]);

  // Auto-dismiss upload progress
  useEffect(() => {
    if (uploadProgress && uploadProgress.loaded >= uploadProgress.total) {
      const timer = setTimeout(() => setUploadProgress(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [uploadProgress]);

  // Clear selection when navigating
  useEffect(() => {
    setSelectedIds(new Set());
    setPreviewItem(null);
  }, [folderId, sidebarView]);

  // ─── Sidebar resize ────────────────────────────────────────────────

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - startX;
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const onUp = () => {
      resizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  // ─── Selection helpers ─────────────────────────────────────────────

  const handleItemClick = useCallback((item: DriveItem, e: React.MouseEvent) => {
    if (item.type === 'folder' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      navigate(`/drive/folder/${item.id}`);
      setSidebarView('files');
      setSearchQuery('');
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
      setLastClickedId(item.id);
    } else if (e.shiftKey && lastClickedId) {
      // Range select
      const items = displayItems;
      const lastIdx = items.findIndex((i) => i.id === lastClickedId);
      const curIdx = items.findIndex((i) => i.id === item.id);
      if (lastIdx >= 0 && curIdx >= 0) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) next.add(items[i].id);
          return next;
        });
      }
    } else {
      // Single click on file → preview
      if (item.type === 'file') {
        setPreviewItem(item);
        setSelectedIds(new Set([item.id]));
      } else {
        setSelectedIds(new Set([item.id]));
      }
      setLastClickedId(item.id);
    }
  }, [navigate, lastClickedId, displayItems]);

  // ─── File operations ──────────────────────────────────────────────

  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    createFolder.mutate(
      { name: newFolderName.trim(), parentId: currentParentId },
      {
        onSuccess: () => {
          setNewFolderOpen(false);
          setNewFolderName('');
          addToast({ type: 'success', message: 'Folder created' });
        },
      },
    );
  }, [newFolderName, currentParentId, createFolder, addToast]);

  const handleUpload = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploadProgress({ loaded: 0, total: 1 });

    uploadFiles.mutate(
      {
        files,
        parentId: currentParentId,
        onProgress: (progress) => setUploadProgress(progress),
      },
      {
        onSuccess: (data) => {
          addToast({ type: 'success', message: `${data.items.length} file${data.items.length > 1 ? 's' : ''} uploaded` });
        },
        onError: () => {
          addToast({ type: 'error', message: 'Upload failed' });
          setUploadProgress(null);
        },
      },
    );
  }, [currentParentId, uploadFiles, addToast]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(e.target.files);
      e.target.value = '';
    }
  }, [handleUpload]);

  const handleRename = useCallback((item: DriveItem) => {
    setRenameId(item.id);
    setRenameValue(item.name);
    setContextMenu(null);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (!renameId || !renameValue.trim()) return;
    updateItem.mutate(
      { id: renameId, name: renameValue.trim() },
      {
        onSuccess: () => {
          setRenameId(null);
          addToast({ type: 'success', message: 'Renamed' });
        },
      },
    );
  }, [renameId, renameValue, updateItem, addToast]);

  const handleToggleFavourite = useCallback((item: DriveItem) => {
    updateItem.mutate(
      { id: item.id, isFavourite: !item.isFavourite },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: item.isFavourite ? 'Removed from favourites' : 'Added to favourites' });
        },
      },
    );
    setContextMenu(null);
  }, [updateItem, addToast]);

  const handleMoveToTrash = useCallback((item: DriveItem) => {
    setConfirmDelete(item);
    setContextMenu(null);
  }, []);

  const confirmMoveToTrash = useCallback(() => {
    if (!confirmDelete) return;
    deleteItem.mutate(confirmDelete.id, {
      onSuccess: () => {
        addToast({ type: 'success', message: 'Moved to trash' });
        setConfirmDelete(null);
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(confirmDelete.id); return n; });
      },
    });
  }, [confirmDelete, deleteItem, addToast]);

  const handleRestore = useCallback((item: DriveItem) => {
    restoreItem.mutate(item.id, {
      onSuccess: () => {
        addToast({ type: 'success', message: 'Restored' });
      },
    });
    setContextMenu(null);
  }, [restoreItem, addToast]);

  const handlePermanentDelete = useCallback((item: DriveItem) => {
    setConfirmPermanent(item);
    setContextMenu(null);
  }, []);

  const confirmPermanentDelete = useCallback(() => {
    if (!confirmPermanent) return;
    permanentDelete.mutate(confirmPermanent.id, {
      onSuccess: () => {
        addToast({ type: 'success', message: 'Permanently deleted' });
        setConfirmPermanent(null);
      },
    });
  }, [confirmPermanent, permanentDelete, addToast]);

  const handleDownload = useCallback((item: DriveItem) => {
    if (item.type !== 'file') return;
    const token = localStorage.getItem('atlasmail_token');
    window.open(`/api/v1/drive/${item.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`, '_blank');
    setContextMenu(null);
  }, []);

  const handleDownloadZip = useCallback((item: DriveItem) => {
    if (item.type !== 'folder') return;
    const token = localStorage.getItem('atlasmail_token');
    window.open(`/api/v1/drive/${item.id}/download-zip${token ? `?token=${encodeURIComponent(token)}` : ''}`, '_blank');
    setContextMenu(null);
  }, []);

  const handleMove = useCallback((item: DriveItem) => {
    setMoveItem(item);
    setMoveTargetId(null);
    setMoveModalOpen(true);
    setContextMenu(null);
  }, []);

  const handleMoveSubmit = useCallback(() => {
    if (!moveItem) return;
    updateItem.mutate(
      { id: moveItem.id, parentId: moveTargetId },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: 'Moved' });
          setMoveModalOpen(false);
          setMoveItem(null);
        },
      },
    );
  }, [moveItem, moveTargetId, updateItem, addToast]);

  const handleDuplicate = useCallback((item: DriveItem) => {
    duplicateItem.mutate(item.id, {
      onSuccess: () => {
        addToast({ type: 'success', message: 'Duplicated' });
      },
    });
    setContextMenu(null);
  }, [duplicateItem, addToast]);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: DriveItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  // ─── Folder icon ───────────────────────────────────────────────────

  const handleSetIcon = useCallback((item: DriveItem) => {
    setIconPickerItem(item);
    setContextMenu(null);
  }, []);

  const handleIconSelect = useCallback((emoji: string) => {
    if (!iconPickerItem) return;
    updateItem.mutate(
      { id: iconPickerItem.id, icon: emoji },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: 'Icon updated' });
          setIconPickerItem(null);
        },
      },
    );
  }, [iconPickerItem, updateItem, addToast]);

  const handleIconRemove = useCallback(() => {
    if (!iconPickerItem) return;
    updateItem.mutate(
      { id: iconPickerItem.id, icon: null },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: 'Icon removed' });
          setIconPickerItem(null);
        },
      },
    );
  }, [iconPickerItem, updateItem, addToast]);

  // ─── Tags ──────────────────────────────────────────────────────────

  const handleAddTag = useCallback((item: DriveItem) => {
    setTagModalItem(item);
    setTagLabel('');
    setTagColor(TAG_COLORS[0].hex);
    setContextMenu(null);
  }, []);

  const handleTagSubmit = useCallback(() => {
    if (!tagModalItem || !tagLabel.trim()) return;
    const tag = `${tagColor}:${tagLabel.trim()}`;
    const newTags = [...(tagModalItem.tags || []), tag];
    updateItem.mutate(
      { id: tagModalItem.id, tags: newTags },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: 'Tag added' });
          setTagModalItem(null);
        },
      },
    );
  }, [tagModalItem, tagLabel, tagColor, updateItem, addToast]);

  const handleRemoveTag = useCallback((item: DriveItem, tagIndex: number) => {
    const newTags = item.tags.filter((_, i) => i !== tagIndex);
    updateItem.mutate({ id: item.id, tags: newTags });
  }, [updateItem]);

  // ─── Bulk operations ──────────────────────────────────────────────

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    batchDelete.mutate(ids, {
      onSuccess: () => {
        addToast({ type: 'success', message: `${ids.length} item${ids.length > 1 ? 's' : ''} moved to trash` });
        setSelectedIds(new Set());
      },
    });
  }, [selectedIds, batchDelete, addToast]);

  const handleBulkFavourite = useCallback(() => {
    const ids = Array.from(selectedIds);
    batchFavourite.mutate(
      { itemIds: ids, isFavourite: true },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: 'Added to favourites' });
          setSelectedIds(new Set());
        },
      },
    );
  }, [selectedIds, batchFavourite, addToast]);

  const handleBulkMoveSubmit = useCallback(() => {
    const ids = Array.from(selectedIds);
    batchMove.mutate(
      { itemIds: ids, parentId: batchMoveTargetId },
      {
        onSuccess: () => {
          addToast({ type: 'success', message: 'Moved' });
          setBatchMoveOpen(false);
          setSelectedIds(new Set());
        },
      },
    );
  }, [selectedIds, batchMoveTargetId, batchMove, addToast]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(displayItems.map((i) => i.id)));
  }, [displayItems]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ─── Drag & drop (file upload from OS) ────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only handle file drops from OS, not internal drags
    if (dragItemId) return;
    dragCounter.current++;
    if (dragCounter.current === 1) setIsDraggingOver(true);
  }, [dragItemId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dragItemId) return;
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDraggingOver(false);
  }, [dragItemId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    if (dragItemId) return; // internal drag, not file upload
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload, dragItemId]);

  // ─── Drag & drop (internal move) ──────────────────────────────────

  const handleItemDragStart = useCallback((e: React.DragEvent, item: DriveItem) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    setDragItemId(item.id);
  }, []);

  const handleItemDragEnd = useCallback(() => {
    setDragItemId(null);
    setDragOverFolderId(null);
  }, []);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    if (!dragItemId || dragItemId === folderId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  }, [dragItemId]);

  const handleFolderDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolderId(null);
  }, []);

  const handleFolderDrop = useCallback((e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId || itemId === targetFolderId) return;

    // If we have multiple selected and the dragged item is among them, move all
    if (selectedIds.has(itemId) && selectedIds.size > 1) {
      batchMove.mutate(
        { itemIds: Array.from(selectedIds), parentId: targetFolderId },
        {
          onSuccess: () => {
            addToast({ type: 'success', message: `${selectedIds.size} items moved` });
            setSelectedIds(new Set());
          },
        },
      );
    } else {
      updateItem.mutate(
        { id: itemId, parentId: targetFolderId },
        {
          onSuccess: () => addToast({ type: 'success', message: 'Moved' }),
        },
      );
    }
    setDragItemId(null);
    setDragOverFolderId(null);
  }, [selectedIds, batchMove, updateItem, addToast]);

  // Drag to sidebar trash = delete
  const handleSidebarTrashDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;

    if (selectedIds.has(itemId) && selectedIds.size > 1) {
      batchDelete.mutate(Array.from(selectedIds), {
        onSuccess: () => {
          addToast({ type: 'success', message: `${selectedIds.size} items moved to trash` });
          setSelectedIds(new Set());
        },
      });
    } else {
      deleteItem.mutate(itemId, {
        onSuccess: () => addToast({ type: 'success', message: 'Moved to trash' }),
      });
    }
    setDragItemId(null);
    setDragOverFolderId(null);
  }, [selectedIds, batchDelete, deleteItem, addToast]);

  // Drag to sidebar "My drive" = move to root
  const handleSidebarRootDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;

    if (selectedIds.has(itemId) && selectedIds.size > 1) {
      batchMove.mutate(
        { itemIds: Array.from(selectedIds), parentId: null },
        {
          onSuccess: () => {
            addToast({ type: 'success', message: 'Moved to root' });
            setSelectedIds(new Set());
          },
        },
      );
    } else {
      updateItem.mutate(
        { id: itemId, parentId: null },
        {
          onSuccess: () => addToast({ type: 'success', message: 'Moved to root' }),
        },
      );
    }
    setDragItemId(null);
    setDragOverFolderId(null);
  }, [selectedIds, batchMove, updateItem, addToast]);

  // ─── Title for the view ────────────────────────────────────────────

  const viewTitle = useMemo(() => {
    if (searchQuery.trim()) return `Search: "${searchQuery}"`;
    if (sidebarView === 'favourites') return 'Favourites';
    if (sidebarView === 'recent') return 'Recent';
    if (sidebarView === 'trash') return 'Trash';
    return '';
  }, [sidebarView, searchQuery]);

  // ─── Build folder tree for move modal ──────────────────────────────

  const folderTree = useMemo(() => {
    const folders = foldersData?.folders ?? [];
    const tree: Array<{ id: string; name: string; depth: number }> = [];

    function buildLevel(parentId: string | null, depth: number) {
      const children = folders.filter((f) => f.parentId === parentId);
      for (const child of children) {
        if (moveItem && child.id === moveItem.id) continue;
        tree.push({ id: child.id, name: child.name, depth });
        buildLevel(child.id, depth + 1);
      }
    }

    buildLevel(null, 0);
    return tree;
  }, [foldersData, moveItem]);

  // Folder tree for batch move
  const batchFolderTree = useMemo(() => {
    const folders = foldersData?.folders ?? [];
    const tree: Array<{ id: string; name: string; depth: number }> = [];

    function buildLevel(parentId: string | null, depth: number) {
      const children = folders.filter((f) => f.parentId === parentId);
      for (const child of children) {
        if (selectedIds.has(child.id)) continue;
        tree.push({ id: child.id, name: child.name, depth });
        buildLevel(child.id, depth + 1);
      }
    }

    buildLevel(null, 0);
    return tree;
  }, [foldersData, selectedIds]);

  // ─── Render helpers ────────────────────────────────────────────────

  const renderTags = (item: DriveItem) => {
    if (!item.tags || item.tags.length === 0) return null;
    return (
      <div className="drive-tags">
        {item.tags.map((tag, i) => {
          const { color, label } = parseTag(tag);
          return (
            <Chip key={i} color={color} height={18} onRemove={() => handleRemoveTag(item, i)}>
              {label}
            </Chip>
          );
        })}
      </div>
    );
  };

  const renderImageThumbnail = (item: DriveItem) => {
    if (!isImageFile(item.mimeType) || !item.storagePath) return null;
    return (
      <img
        src={`/api/v1/uploads/${item.storagePath}${getTokenParam()}`}
        alt={item.name}
        className="drive-grid-card-thumbnail"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  };

  return (
    <div className="drive-page">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <div className="drive-sidebar" style={{ width: sidebarWidth }}>
        <div className="drive-sidebar-header">
          <button
            onClick={() => navigate(ROUTES.HOME)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--font-size-sm)',
              padding: '4px 6px',
              borderRadius: 'var(--radius-sm)',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            <ArrowLeft size={16} />
          </button>
          <span className="drive-sidebar-title">Drive</span>
          <div style={{ flex: 1 }} />
        </div>

        <div className="drive-sidebar-actions">
          <button
            onClick={() => setNewFolderOpen(true)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 32,
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-primary)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-primary)'; }}
          >
            <FolderPlus size={14} />
            New folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 32,
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent-primary)',
              color: '#fff',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-primary-hover, #0f6350)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent-primary)'; }}
          >
            <Upload size={14} />
            Upload
          </button>
        </div>

        <nav className="drive-sidebar-nav">
          <button
            className={`drive-nav-item ${sidebarView === 'files' && !folderId ? 'active' : ''}`}
            onClick={() => { setSidebarView('files'); setSearchQuery(''); navigate(ROUTES.DRIVE); }}
            onDragOver={(e) => { if (dragItemId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
            onDrop={handleSidebarRootDrop}
          >
            <HardDrive size={16} />
            My drive
          </button>
          <button
            className={`drive-nav-item ${sidebarView === 'favourites' ? 'active' : ''}`}
            onClick={() => { setSidebarView('favourites'); setSearchQuery(''); }}
          >
            <Heart size={16} />
            Favourites
          </button>
          <button
            className={`drive-nav-item ${sidebarView === 'recent' ? 'active' : ''}`}
            onClick={() => { setSidebarView('recent'); setSearchQuery(''); }}
          >
            <Clock size={16} />
            Recent
          </button>
          <button
            className={`drive-nav-item ${sidebarView === 'trash' ? 'active' : ''}`}
            onClick={() => { setSidebarView('trash'); setSearchQuery(''); }}
            onDragOver={(e) => { if (dragItemId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
            onDrop={handleSidebarTrashDrop}
          >
            <Trash2 size={16} />
            Trash
          </button>
        </nav>

        {/* Storage usage */}
        {storageData && (
          <div className="drive-storage">
            <span className="drive-storage-label">{formatBytes(storageData.totalBytes)} used</span>
            <div className="drive-storage-bar">
              <div className="drive-storage-fill" style={{ width: `${Math.min(100, (storageData.totalBytes / (1024 * 1024 * 1024)) * 100)}%` }} />
            </div>
          </div>
        )}

        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            top: 0,
            right: -2,
            bottom: 0,
            width: 4,
            cursor: 'col-resize',
            zIndex: 10,
          }}
        />
      </div>

      {/* ─── Main content ────────────────────────────────────────── */}
      <div className="drive-main" style={{ flex: previewItem ? undefined : 1 }}>
        {/* Upload progress bar */}
        {uploadProgress && (
          <div className="drive-upload-progress">
            <div className="drive-upload-progress-info">
              <span>Uploading...</span>
              <span>{Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%</span>
            </div>
            <div className="drive-upload-progress-bar">
              <div
                className="drive-upload-progress-fill"
                style={{ width: `${Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="drive-toolbar">
          <div className="drive-toolbar-left">
            {sidebarView === 'files' && !searchQuery.trim() ? (
              <div className="drive-breadcrumbs">
                <button
                  className={`drive-breadcrumb-item ${!folderId ? 'current' : ''}`}
                  onClick={() => { if (folderId) navigate(ROUTES.DRIVE); }}
                >
                  My drive
                </button>
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronRight size={12} className="drive-breadcrumb-separator" />
                    <button
                      className={`drive-breadcrumb-item ${i === breadcrumbs.length - 1 ? 'current' : ''}`}
                      onClick={() => { if (i < breadcrumbs.length - 1) navigate(`/drive/folder/${crumb.id}`); }}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {viewTitle}
              </span>
            )}
          </div>

          <div className="drive-toolbar-right">
            {/* Sort dropdown */}
            <div ref={sortDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 32,
                  padding: '0 10px',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-primary)',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-family)',
                  cursor: 'pointer',
                }}
              >
                {SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Sort'}
                <ChevronDown size={12} />
              </button>
              {sortDropdownOpen && (
                <div className="drive-sort-dropdown">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`drive-sort-option ${sortBy === opt.value ? 'active' : ''}`}
                      onClick={() => { setSortBy(opt.value); setSortDropdownOpen(false); }}
                    >
                      {opt.label}
                      {sortBy === opt.value && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
              <input
                className="drive-search-input"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* View toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              title={viewMode === 'list' ? 'Grid view' : 'List view'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-primary)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-primary)'; }}
            >
              {viewMode === 'list' ? <LayoutGrid size={16} /> : <LayoutList size={16} />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="drive-content"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => { if (!hasSelection) { setSelectedIds(new Set()); } setContextMenu(null); }}
        >
          {/* Drop zone overlay */}
          {isDraggingOver && (
            <div className="drive-dropzone-overlay">
              <div className="drive-dropzone-label">
                <UploadIcon size={32} />
                Drop files to upload
              </div>
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              Loading...
            </div>
          ) : displayItems.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 12,
              color: 'var(--color-text-tertiary)',
              padding: 32,
            }}>
              {sidebarView === 'trash' ? (
                <>
                  <Trash2 size={40} strokeWidth={1.2} />
                  <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Trash is empty</span>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>Deleted files will appear here</span>
                </>
              ) : sidebarView === 'favourites' ? (
                <>
                  <Heart size={40} strokeWidth={1.2} />
                  <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>No favourites</span>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>Star files and folders to find them here</span>
                </>
              ) : searchQuery.trim() ? (
                <>
                  <Search size={40} strokeWidth={1.2} />
                  <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>No results</span>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>Try a different search term</span>
                </>
              ) : (
                <>
                  <HardDrive size={40} strokeWidth={1.2} />
                  <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>This folder is empty</span>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>Upload files or create a folder to get started</span>
                </>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <>
              {/* List header */}
              <div className="drive-list-header">
                <span
                  className="drive-sort-header"
                  onClick={() => setSortBy(sortBy === 'name' ? 'default' : 'name')}
                >
                  Name {sortBy === 'name' && '↑'}
                </span>
                <span
                  className="drive-sort-header"
                  onClick={() => setSortBy(sortBy === 'size' ? 'default' : 'size')}
                >
                  Size {sortBy === 'size' && '↓'}
                </span>
                <span
                  className="drive-sort-header"
                  onClick={() => setSortBy(sortBy === 'date' ? 'default' : 'date')}
                >
                  Modified {sortBy === 'date' && '↓'}
                </span>
              </div>
              {displayItems.map((item) => {
                const Icon = getFileIcon(item.mimeType, item.type);
                const iconColor = getFileIconColor(item.mimeType, item.type);
                const isRenaming = renameId === item.id;
                const isSelected = selectedIds.has(item.id);
                const isDragTarget = dragOverFolderId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`drive-list-row ${isSelected ? 'selected' : ''} ${isDragTarget ? 'drive-drag-over' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleItemClick(item, e); }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    onDoubleClick={() => { if (item.type === 'folder') { navigate(`/drive/folder/${item.id}`); setSidebarView('files'); } }}
                    draggable={!isRenaming}
                    onDragStart={(e) => handleItemDragStart(e, item)}
                    onDragEnd={handleItemDragEnd}
                    onDragOver={item.type === 'folder' ? (e) => handleFolderDragOver(e, item.id) : undefined}
                    onDragLeave={item.type === 'folder' ? handleFolderDragLeave : undefined}
                    onDrop={item.type === 'folder' ? (e) => handleFolderDrop(e, item.id) : undefined}
                  >
                    <div className="drive-list-name">
                      <input
                        type="checkbox"
                        className="drive-checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {item.icon ? (
                        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                      ) : (
                        <Icon size={18} color={iconColor} />
                      )}
                      {isRenaming ? (
                        <input
                          className="drive-rename-input"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={handleRenameSubmit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit();
                            if (e.key === 'Escape') setRenameId(null);
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span>{item.name}</span>
                      )}
                      {item.isFavourite && (
                        <Star size={12} fill="var(--color-star, #f59e0b)" color="var(--color-star, #f59e0b)" />
                      )}
                      {renderTags(item)}
                    </div>
                    <span className="drive-list-size">
                      {item.type === 'file' ? formatBytes(item.size) : '—'}
                    </span>
                    <span className="drive-list-modified">
                      {formatRelativeDate(item.updatedAt)}
                    </span>
                  </div>
                );
              })}
            </>
          ) : (
            /* Grid view */
            <div className="drive-grid">
              {displayItems.map((item) => {
                const Icon = getFileIcon(item.mimeType, item.type);
                const iconColor = getFileIconColor(item.mimeType, item.type);
                const isSelected = selectedIds.has(item.id);
                const isRenaming = renameId === item.id;
                const showThumb = isImageFile(item.mimeType) && item.storagePath;
                const isDragTarget = dragOverFolderId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`drive-grid-card ${isSelected ? 'selected' : ''} ${isDragTarget ? 'drive-drag-over' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleItemClick(item, e); }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    draggable={!isRenaming}
                    onDragStart={(e) => handleItemDragStart(e, item)}
                    onDragEnd={handleItemDragEnd}
                    onDragOver={item.type === 'folder' ? (e) => handleFolderDragOver(e, item.id) : undefined}
                    onDragLeave={item.type === 'folder' ? handleFolderDragLeave : undefined}
                    onDrop={item.type === 'folder' ? (e) => handleFolderDrop(e, item.id) : undefined}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      className="drive-checkbox drive-grid-checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="drive-grid-card-icon">
                      {showThumb ? (
                        <img
                          src={`/api/v1/uploads/${item.storagePath}${getTokenParam()}`}
                          alt={item.name}
                          className="drive-grid-card-thumbnail"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : item.type === 'folder' && item.icon ? (
                        <span style={{ fontSize: 36, lineHeight: 1 }}>{item.icon}</span>
                      ) : (
                        <Icon size={36} color={iconColor} strokeWidth={1.4} />
                      )}
                    </div>
                    {isRenaming ? (
                      <input
                        className="drive-rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit();
                          if (e.key === 'Escape') setRenameId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        style={{ textAlign: 'center' }}
                      />
                    ) : (
                      <span className="drive-grid-card-name">{item.name}</span>
                    )}
                    <span className="drive-grid-card-meta">
                      {item.type === 'file' ? formatBytes(item.size) : `${formatRelativeDate(item.updatedAt)}`}
                    </span>
                    {renderTags(item)}
                    {item.isFavourite && (
                      <Star size={12} fill="var(--color-star, #f59e0b)" color="var(--color-star, #f59e0b)" style={{ position: 'absolute', top: 8, right: 8 }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Preview panel ─────────────────────────────────────────── */}
      {previewItem && (
        <div className="drive-preview-panel">
          <div className="drive-preview-header">
            <span className="drive-preview-title">{previewItem.name}</span>
            <button
              onClick={() => setPreviewItem(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="drive-preview-body">
            {isImageFile(previewItem.mimeType) && previewItem.storagePath ? (
              <img
                src={`/api/v1/uploads/${previewItem.storagePath}${getTokenParam()}`}
                alt={previewItem.name}
                className="drive-preview-image"
              />
            ) : previewItem.mimeType?.includes('pdf') && previewItem.storagePath ? (
              <iframe
                src={`/api/v1/uploads/${previewItem.storagePath}${getTokenParam()}`}
                className="drive-preview-iframe"
                title={previewItem.name}
              />
            ) : previewFileId && filePreviewData ? (
              <div className="drive-preview-text-content">
                {getFileExtension(previewItem.name) === 'csv' ? (
                  (() => {
                    const rows = parseCsvToRows(filePreviewData.content);
                    if (rows.length === 0) return <pre className="drive-preview-pre">(empty)</pre>;
                    const header = rows[0];
                    const body = rows.slice(1);
                    return (
                      <div className="drive-preview-table-wrap">
                        <table className="drive-preview-table">
                          <thead>
                            <tr>{header.map((h, i) => <th key={i}>{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {body.map((row, ri) => (
                              <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                            ))}
                          </tbody>
                        </table>
                        {filePreviewData.truncated && (
                          <div className="drive-preview-truncated">File truncated — showing first 512 KB</div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <>
                    <pre className="drive-preview-pre">{filePreviewData.content}</pre>
                    {filePreviewData.truncated && (
                      <div className="drive-preview-truncated">File truncated — showing first 512 KB</div>
                    )}
                  </>
                )}
              </div>
            ) : previewFileId && previewLoading ? (
              <div className="drive-preview-icon">
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Loading preview…</span>
              </div>
            ) : (
              <div className="drive-preview-icon">
                {(() => {
                  const Icon = getFileIcon(previewItem.mimeType, previewItem.type);
                  const color = getFileIconColor(previewItem.mimeType, previewItem.type);
                  return <Icon size={64} color={color} strokeWidth={1.2} />;
                })()}
              </div>
            )}
          </div>

          <div className="drive-preview-meta">
            <div className="drive-preview-meta-row">
              <span className="drive-preview-meta-label">Size</span>
              <span>{formatBytes(previewItem.size)}</span>
            </div>
            <div className="drive-preview-meta-row">
              <span className="drive-preview-meta-label">Modified</span>
              <span>{formatRelativeDate(previewItem.updatedAt)}</span>
            </div>
            {previewItem.mimeType && (
              <div className="drive-preview-meta-row">
                <span className="drive-preview-meta-label">Type</span>
                <span>{previewItem.mimeType}</span>
              </div>
            )}
            {previewItem.tags && previewItem.tags.length > 0 && (
              <div className="drive-preview-meta-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                <span className="drive-preview-meta-label">Tags</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {previewItem.tags.map((tag, i) => {
                    const { color, label } = parseTag(tag);
                    return <Chip key={i} color={color} height={20}>{label}</Chip>;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Context menu ────────────────────────────────────────── */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} minWidth={180}>
          {sidebarView === 'trash' ? (
            <>
              <ContextMenuItem
                icon={<RotateCcw size={14} />}
                label="Restore"
                onClick={() => handleRestore(contextMenu.item)}
              />
              <ContextMenuSeparator />
              <ContextMenuItem
                icon={<Trash2 size={14} />}
                label="Delete permanently"
                onClick={() => handlePermanentDelete(contextMenu.item)}
                destructive
              />
            </>
          ) : (
            <>
              {contextMenu.item.type === 'file' && (
                <ContextMenuItem
                  icon={<Download size={14} />}
                  label="Download"
                  onClick={() => handleDownload(contextMenu.item)}
                />
              )}
              {contextMenu.item.type === 'folder' && (
                <ContextMenuItem
                  icon={<FileArchive size={14} />}
                  label="Download as ZIP"
                  onClick={() => handleDownloadZip(contextMenu.item)}
                />
              )}
              <ContextMenuItem
                icon={<Pencil size={14} />}
                label="Rename"
                onClick={() => handleRename(contextMenu.item)}
              />
              {contextMenu.item.type === 'folder' && (
                <ContextMenuItem
                  icon={<span style={{ fontSize: 14, lineHeight: 1 }}>{contextMenu.item.icon || '😀'}</span>}
                  label={contextMenu.item.icon ? 'Change icon' : 'Add icon'}
                  onClick={() => handleSetIcon(contextMenu.item)}
                />
              )}
              <ContextMenuItem
                icon={<Copy size={14} />}
                label="Duplicate"
                onClick={() => handleDuplicate(contextMenu.item)}
              />
              <ContextMenuItem
                icon={<FolderInput size={14} />}
                label="Move to..."
                onClick={() => handleMove(contextMenu.item)}
              />
              <ContextMenuItem
                icon={<Star size={14} />}
                label={contextMenu.item.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                onClick={() => handleToggleFavourite(contextMenu.item)}
              />
              <ContextMenuItem
                icon={<Tag size={14} />}
                label="Add tag"
                onClick={() => handleAddTag(contextMenu.item)}
              />
              <ContextMenuSeparator />
              <ContextMenuItem
                icon={<Trash2 size={14} />}
                label="Move to trash"
                onClick={() => handleMoveToTrash(contextMenu.item)}
                destructive
              />
            </>
          )}
        </ContextMenu>
      )}

      {/* ─── New folder modal ────────────────────────────────────── */}
      <Modal open={newFolderOpen} onOpenChange={setNewFolderOpen} width={400} title="New folder">
        <div style={{ padding: 'var(--spacing-xl)' }}>
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button
              onClick={() => setNewFolderOpen(false)}
              style={{
                height: 34,
                padding: '0 16px',
                background: 'transparent',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-md)',
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              style={{
                height: 34,
                padding: '0 16px',
                background: newFolderName.trim() ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: newFolderName.trim() ? '#fff' : 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-md)',
                fontWeight: 500,
                fontFamily: 'var(--font-family)',
                cursor: newFolderName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Create
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Move modal ──────────────────────────────────────────── */}
      <Modal open={moveModalOpen} onOpenChange={setMoveModalOpen} width={400} title="Move to...">
        <div style={{ padding: 'var(--spacing-xl)', maxHeight: 400, overflowY: 'auto' }}>
          <button
            onClick={() => setMoveTargetId(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: moveTargetId === null ? 'var(--color-surface-active)' : 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <HardDrive size={16} />
            My drive (root)
          </button>

          {folderTree.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setMoveTargetId(folder.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                paddingLeft: 10 + folder.depth * 20,
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: moveTargetId === folder.id ? 'var(--color-surface-active)' : 'transparent',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <FolderPlus size={16} color="#64748b" />
              {folder.name}
            </button>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, borderTop: '1px solid var(--color-border-secondary)', paddingTop: 16 }}>
            <button
              onClick={() => setMoveModalOpen(false)}
              style={{
                height: 34,
                padding: '0 16px',
                background: 'transparent',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-md)',
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleMoveSubmit}
              style={{
                height: 34,
                padding: '0 16px',
                background: 'var(--color-accent-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: 'var(--font-size-md)',
                fontWeight: 500,
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
              }}
            >
              Move here
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Batch move modal ─────────────────────────────────────── */}
      <Modal open={batchMoveOpen} onOpenChange={setBatchMoveOpen} width={400} title={`Move ${selectedIds.size} items to...`}>
        <div style={{ padding: 'var(--spacing-xl)', maxHeight: 400, overflowY: 'auto' }}>
          <button
            onClick={() => setBatchMoveTargetId(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: batchMoveTargetId === null ? 'var(--color-surface-active)' : 'transparent',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <HardDrive size={16} />
            My drive (root)
          </button>
          {batchFolderTree.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setBatchMoveTargetId(folder.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                paddingLeft: 10 + folder.depth * 20,
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: batchMoveTargetId === folder.id ? 'var(--color-surface-active)' : 'transparent',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <FolderPlus size={16} color="#64748b" />
              {folder.name}
            </button>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, borderTop: '1px solid var(--color-border-secondary)', paddingTop: 16 }}>
            <button
              onClick={() => setBatchMoveOpen(false)}
              style={{
                height: 34,
                padding: '0 16px',
                background: 'transparent',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-md)',
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkMoveSubmit}
              style={{
                height: 34,
                padding: '0 16px',
                background: 'var(--color-accent-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: 'var(--font-size-md)',
                fontWeight: 500,
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
              }}
            >
              Move here
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Tag modal ────────────────────────────────────────────── */}
      <Modal open={!!tagModalItem} onOpenChange={() => setTagModalItem(null)} width={360} title="Add tag">
        <div style={{ padding: 'var(--spacing-xl)' }}>
          <input
            value={tagLabel}
            onChange={(e) => setTagLabel(e.target.value)}
            placeholder="Tag name"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleTagSubmit(); }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {TAG_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => setTagColor(c.hex)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: tagColor === c.hex ? `2px solid ${c.hex}` : '2px solid transparent',
                  background: c.hex,
                  cursor: 'pointer',
                  outline: tagColor === c.hex ? `2px solid var(--color-bg-primary)` : 'none',
                  outlineOffset: -4,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button
              onClick={() => setTagModalItem(null)}
              style={{
                height: 34,
                padding: '0 16px',
                background: 'transparent',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-md)',
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleTagSubmit}
              disabled={!tagLabel.trim()}
              style={{
                height: 34,
                padding: '0 16px',
                background: tagLabel.trim() ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: tagLabel.trim() ? '#fff' : 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-md)',
                fontWeight: 500,
                fontFamily: 'var(--font-family)',
                cursor: tagLabel.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Add
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Floating bulk action bar ──────────────────────────────── */}
      {hasSelection && (
        <div className="drive-bulk-bar">
          <span className="drive-bulk-count">{selectedIds.size} selected</span>
          <button className="drive-bulk-btn" onClick={handleSelectAll} title="Select all">
            <Check size={14} /> Select all
          </button>
          <button className="drive-bulk-btn" onClick={handleClearSelection} title="Clear">
            <X size={14} /> Clear
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--color-border-primary)' }} />
          <button className="drive-bulk-btn" onClick={() => { setBatchMoveTargetId(null); setBatchMoveOpen(true); }} title="Move">
            <FolderInput size={14} /> Move
          </button>
          <button className="drive-bulk-btn" onClick={handleBulkFavourite} title="Favourite">
            <Star size={14} /> Favourite
          </button>
          <button className="drive-bulk-btn drive-bulk-btn-destructive" onClick={handleBulkDelete} title="Delete">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* ─── Confirm dialogs ─────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Move to trash"
        description={`"${confirmDelete?.name}" will be moved to trash. You can restore it later.`}
        confirmLabel="Move to trash"
        onConfirm={confirmMoveToTrash}
        destructive
      />

      <ConfirmDialog
        open={!!confirmPermanent}
        onOpenChange={() => setConfirmPermanent(null)}
        title="Delete permanently"
        description={`"${confirmPermanent?.name}" will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete permanently"
        onConfirm={confirmPermanentDelete}
        destructive
      />

      {iconPickerItem && (
        <Modal open onOpenChange={() => setIconPickerItem(null)} title="Choose folder icon">
          <EmojiPicker
            onSelect={handleIconSelect}
            onRemove={iconPickerItem.icon ? handleIconRemove : undefined}
            onClose={() => setIconPickerItem(null)}
          />
        </Modal>
      )}
    </div>
  );
}
