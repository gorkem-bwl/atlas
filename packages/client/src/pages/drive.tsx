import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Upload, FolderPlus, ArrowLeft, Trash2, RotateCcw,
  Star, MoreHorizontal, Pencil, Download, FolderInput, ChevronRight,
  LayoutGrid, LayoutList, Home, Clock, Heart, HardDrive, Upload as UploadIcon,
  ExternalLink, FileText, Table2, ChevronDown,
} from 'lucide-react';
import {
  useDriveItems, useDriveBreadcrumbs, useDriveFavourites, useDriveRecent,
  useDriveTrash, useDriveSearch, useCreateFolder, useUploadFiles,
  useUpdateDriveItem, useDeleteDriveItem, useRestoreDriveItem,
  usePermanentDeleteDriveItem, useDriveStorage, useDriveFolders,
  useCreateLinkedDocument, useCreateLinkedDrawing, useCreateLinkedSpreadsheet,
} from '../hooks/use-drive';
import { api } from '../lib/api-client';
import { useToastStore } from '../stores/toast-store';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '../components/ui/context-menu';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { Modal } from '../components/ui/modal';
import { getFileIcon, getFileIconColor, formatBytes, formatRelativeDate } from '../lib/drive-utils';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: DriveItem } | null>(null);
  const [newDropdownOpen, setNewDropdownOpen] = useState(false);
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
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizingRef = useRef(false);
  const newDropdownRef = useRef<HTMLDivElement>(null);

  // Queries
  const currentParentId = folderId || null;
  const { data: itemsData, isLoading: itemsLoading } = useDriveItems(sidebarView === 'files' ? currentParentId : undefined);
  const { data: breadcrumbsData } = useDriveBreadcrumbs(folderId);
  const { data: favouritesData } = useDriveFavourites();
  const { data: recentData } = useDriveRecent();
  const { data: trashData } = useDriveTrash();
  const { data: searchData } = useDriveSearch(searchQuery);
  const { data: storageData } = useDriveStorage();
  const { data: foldersData } = useDriveFolders();

  // Mutations
  const createFolder = useCreateFolder();
  const uploadFiles = useUploadFiles();
  const updateItem = useUpdateDriveItem();
  const deleteItem = useDeleteDriveItem();
  const restoreItem = useRestoreDriveItem();
  const permanentDelete = usePermanentDeleteDriveItem();
  const createLinkedDocument = useCreateLinkedDocument();
  const createLinkedDrawing = useCreateLinkedDrawing();
  const createLinkedSpreadsheet = useCreateLinkedSpreadsheet();

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

  // Save view mode
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Close new dropdown on click outside
  useEffect(() => {
    if (!newDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(e.target as Node)) {
        setNewDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [newDropdownOpen]);

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

    uploadFiles.mutate(
      { files, parentId: currentParentId },
      {
        onSuccess: (data) => {
          addToast({ type: 'success', message: `${data.items.length} file${data.items.length > 1 ? 's' : ''} uploaded` });
        },
        onError: () => {
          addToast({ type: 'error', message: 'Upload failed' });
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

  const handleItemClick = useCallback((item: DriveItem) => {
    if (item.type === 'folder') {
      navigate(`/drive/folder/${item.id}`);
      setSidebarView('files');
      setSearchQuery('');
      return;
    }

    // Open linked resources in their native editor
    if (item.linkedResourceType && item.linkedResourceId) {
      if (item.linkedResourceType === 'document') navigate(`/docs/${item.linkedResourceId}`);
      else if (item.linkedResourceType === 'drawing') navigate(`/draw/${item.linkedResourceId}`);
      else if (item.linkedResourceType === 'spreadsheet') navigate(`/tables/${item.linkedResourceId}`);
      return;
    }

    setSelectedId(item.id === selectedId ? null : item.id);
  }, [navigate, selectedId]);

  const handleRename = useCallback((item: DriveItem) => {
    setRenameId(item.id);
    setRenameValue(item.name);
    setContextMenu(null);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (!renameId || !renameValue.trim()) return;
    const trimmedName = renameValue.trim();
    const item = displayItems.find((i) => i.id === renameId);

    updateItem.mutate(
      { id: renameId, name: trimmedName },
      {
        onSuccess: () => {
          setRenameId(null);
          addToast({ type: 'success', message: 'Renamed' });

          // Sync title to linked resource
          if (item?.linkedResourceType && item?.linkedResourceId) {
            if (item.linkedResourceType === 'document') {
              api.patch(`/docs/${item.linkedResourceId}`, { title: trimmedName }).catch(() => {});
            } else if (item.linkedResourceType === 'drawing') {
              api.patch(`/drawings/${item.linkedResourceId}`, { title: trimmedName }).catch(() => {});
            } else if (item.linkedResourceType === 'spreadsheet') {
              api.patch(`/tables/${item.linkedResourceId}`, { title: trimmedName }).catch(() => {});
            }
          }
        },
      },
    );
  }, [renameId, renameValue, updateItem, addToast, displayItems]);

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
    window.open(`/api/drive/${item.id}/download`, '_blank');
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

  const handleContextMenu = useCallback((e: React.MouseEvent, item: DriveItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  // ─── Drag & drop upload ───────────────────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDraggingOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

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
        if (moveItem && child.id === moveItem.id) continue; // Don't show self
        tree.push({ id: child.id, name: child.name, depth });
        buildLevel(child.id, depth + 1);
      }
    }

    buildLevel(null, 0);
    return tree;
  }, [foldersData, moveItem]);

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
          <div ref={newDropdownRef} style={{ flex: 1, position: 'relative' }}>
            <button
              onClick={() => setNewDropdownOpen((v) => !v)}
              style={{
                width: '100%',
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
              <Plus size={14} />
              New
              <ChevronDown size={12} />
            </button>
            {newDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 50,
                padding: '4px 0',
                minWidth: 180,
              }}>
                <button
                  onClick={() => { setNewDropdownOpen(false); setNewFolderOpen(true); }}
                  className="drive-new-dropdown-item"
                >
                  <FolderPlus size={14} />
                  New folder
                </button>
                <div style={{ height: 1, background: 'var(--color-border-primary)', margin: '4px 0' }} />
                <button
                  onClick={() => {
                    setNewDropdownOpen(false);
                    createLinkedDocument.mutate({ parentId: currentParentId }, {
                      onSuccess: (data) => {
                        navigate(`/docs/${data.resourceId}`);
                      },
                      onError: () => addToast({ type: 'error', message: 'Failed to create document' }),
                    });
                  }}
                  className="drive-new-dropdown-item"
                >
                  <FileText size={14} />
                  New document
                </button>
                <button
                  onClick={() => {
                    setNewDropdownOpen(false);
                    createLinkedDrawing.mutate({ parentId: currentParentId }, {
                      onSuccess: (data) => {
                        navigate(`/draw/${data.resourceId}`);
                      },
                      onError: () => addToast({ type: 'error', message: 'Failed to create drawing' }),
                    });
                  }}
                  className="drive-new-dropdown-item"
                >
                  <Pencil size={14} />
                  New drawing
                </button>
                <button
                  onClick={() => {
                    setNewDropdownOpen(false);
                    createLinkedSpreadsheet.mutate({ parentId: currentParentId }, {
                      onSuccess: (data) => {
                        navigate(`/tables/${data.resourceId}`);
                      },
                      onError: () => addToast({ type: 'error', message: 'Failed to create spreadsheet' }),
                    });
                  }}
                  className="drive-new-dropdown-item"
                >
                  <Table2 size={14} />
                  New spreadsheet
                </button>
              </div>
            )}
          </div>
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
      <div className="drive-main">
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
          onClick={() => { setSelectedId(null); setContextMenu(null); }}
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
                <span>Name</span>
                <span>Size</span>
                <span>Modified</span>
              </div>
              {displayItems.map((item) => {
                const Icon = getFileIcon(item.mimeType, item.type);
                const iconColor = getFileIconColor(item.mimeType, item.type);
                const isRenaming = renameId === item.id;
                const isSelected = selectedId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`drive-list-row ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    onDoubleClick={() => { if (item.type === 'folder') handleItemClick(item); }}
                  >
                    <div className="drive-list-name">
                      <Icon size={18} color={iconColor} />
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
                const isSelected = selectedId === item.id;
                const isRenaming = renameId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`drive-grid-card ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <div className="drive-grid-card-icon">
                      <Icon size={36} color={iconColor} strokeWidth={1.4} />
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
              {contextMenu.item.linkedResourceType && contextMenu.item.linkedResourceId && (
                <ContextMenuItem
                  icon={<ExternalLink size={14} />}
                  label="Open in editor"
                  onClick={() => {
                    const item = contextMenu.item;
                    setContextMenu(null);
                    if (item.linkedResourceType === 'document') navigate(`/docs/${item.linkedResourceId}`);
                    else if (item.linkedResourceType === 'drawing') navigate(`/draw/${item.linkedResourceId}`);
                    else if (item.linkedResourceType === 'spreadsheet') navigate(`/tables/${item.linkedResourceId}`);
                  }}
                />
              )}
              {contextMenu.item.type === 'file' && !contextMenu.item.linkedResourceType && (
                <ContextMenuItem
                  icon={<Download size={14} />}
                  label="Download"
                  onClick={() => handleDownload(contextMenu.item)}
                />
              )}
              <ContextMenuItem
                icon={<Pencil size={14} />}
                label="Rename"
                onClick={() => handleRename(contextMenu.item)}
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
          {/* Root */}
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
    </div>
  );
}
