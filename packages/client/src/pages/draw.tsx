import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import {
  Plus,
  Search,
  ArrowLeft,
  Trash2,
  RotateCcw,
  Pencil,
} from 'lucide-react';
import {
  useDrawingList,
  useDrawing,
  useCreateDrawing,
  useDeleteDrawing,
  useRestoreDrawing,
  useAutoSaveDrawing,
} from '../hooks/use-drawings';
import { useSettingsStore } from '../stores/settings-store';
import { ROUTES } from '../config/routes';
import type { Drawing } from '@atlasmail/shared';

// ─── Constants ───────────────────────────────────────────────────────

const SIDEBAR_WIDTH_KEY = 'atlasmail_draw_sidebar_width';
const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 440;

function getSavedSidebarWidth(): number {
  try {
    const w = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) || '', 10);
    if (w >= MIN_SIDEBAR_WIDTH && w <= MAX_SIDEBAR_WIDTH) return w;
  } catch { /* ignore */ }
  return DEFAULT_SIDEBAR_WIDTH;
}

// ─── Sidebar button ──────────────────────────────────────────────────

function SidebarButton({
  icon,
  onClick,
  tooltip,
  disabled,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  tooltip?: string;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={tooltip}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        padding: 0,
        background: hovered ? 'var(--color-surface-hover)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s ease',
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );
}

// ─── Drawing list item ───────────────────────────────────────────────

function DrawingListItem({
  drawing,
  isSelected,
  onClick,
  onDelete,
  onRestore,
  isTrash,
}: {
  drawing: Drawing;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  isTrash?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const bg = isSelected
    ? 'var(--color-surface-selected)'
    : hovered
      ? 'var(--color-surface-hover)'
      : 'transparent';

  const updatedLabel = new Date(drawing.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '7px 8px',
          paddingRight: hovered && (onDelete || onRestore) ? 56 : 8,
          background: bg,
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'background 0.12s ease',
          textAlign: 'left',
          fontFamily: 'var(--font-family)',
        }}
      >
        <Pencil
          size={14}
          style={{
            flexShrink: 0,
            color: isSelected ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: isSelected ? 600 : 400,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {drawing.title || 'Untitled'}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              marginTop: 1,
            }}
          >
            {updatedLabel}
          </div>
        </div>
      </button>

      {/* Hover actions */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            gap: 2,
          }}
        >
          {isTrash && onRestore && (
            <SidebarButton
              icon={<RotateCcw size={12} />}
              onClick={onRestore}
              tooltip="Restore"
            />
          )}
          {onDelete && (
            <SidebarButton
              icon={<Trash2 size={12} />}
              onClick={onDelete}
              tooltip={isTrash ? 'Delete permanently' : 'Move to trash'}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Draw sidebar ────────────────────────────────────────────────────

type SidebarView = 'list' | 'trash';

function DrawSidebar({
  selectedId,
  onSelect,
}: {
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const navigate = useNavigate();
  const isDesktop = !!('atlasDesktop' in window);
  const { data, isLoading } = useDrawingList();
  const { data: archivedData } = useDrawingList(true);
  const createDrawing = useCreateDrawing();
  const deleteDrawing = useDeleteDrawing();
  const restoreDrawing = useRestoreDrawing();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [view, setView] = useState<SidebarView>('list');
  const [sidebarWidth, setSidebarWidth] = useState(getSavedSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Sidebar resize handler
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + (ev.clientX - startX)));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      const el = sidebarRef.current;
      if (el) {
        const w = el.getBoundingClientRect().width;
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(w)));
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  const handleNewDrawing = useCallback(() => {
    createDrawing.mutate({ title: 'Untitled' }, {
      onSuccess: (drawing) => {
        onSelect(drawing.id);
      },
    });
  }, [createDrawing, onSelect]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteDrawing.mutate(id);
    },
    [deleteDrawing],
  );

  const handleRestore = useCallback(
    (id: string) => {
      restoreDrawing.mutate(id);
    },
    [restoreDrawing],
  );

  const allDrawings = data?.drawings ?? [];
  const archivedDrawings = (archivedData?.drawings ?? []).filter((d) => d.isArchived);

  const filteredDrawings = useMemo(() => {
    if (!searchQuery.trim()) return allDrawings;
    const q = searchQuery.toLowerCase();
    return allDrawings.filter((d) =>
      (d.title || 'Untitled').toLowerCase().includes(q),
    );
  }, [allDrawings, searchQuery]);

  return (
    <div
      ref={sidebarRef}
      style={{
        width: sidebarWidth,
        minWidth: MIN_SIDEBAR_WIDTH,
        maxWidth: MAX_SIDEBAR_WIDTH,
        height: '100%',
        borderRight: '1px solid var(--color-border-primary)',
        background: 'var(--color-bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-family)',
        overflow: 'hidden',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Resize handle */}
      <div
        className="doc-sidebar-resize-handle"
        style={{
          position: 'absolute',
          top: 0,
          right: -3,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          zIndex: 10,
          transition: 'background 0.15s ease',
          ...(isResizing ? { background: 'var(--color-accent-primary)', opacity: 0.3 } : {}),
        }}
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div
        style={{
          padding: '12px 12px 0 12px',
          paddingTop: isDesktop ? 40 : 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Back + title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SidebarButton
            icon={<ArrowLeft size={14} />}
            onClick={() => navigate(ROUTES.HOME)}
            tooltip="Home screen"
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Draw
          </span>
          <div style={{ flex: 1 }} />
          <SidebarButton
            icon={<Plus size={14} />}
            onClick={handleNewDrawing}
            tooltip="New drawing"
            disabled={createDrawing.isPending}
          />
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 8px',
            borderRadius: 'var(--radius-sm)',
            background: searchFocused ? 'var(--color-bg-primary)' : 'transparent',
            border: `1px solid ${searchFocused ? 'var(--color-border-primary)' : 'transparent'}`,
            transition: 'all 0.15s ease',
          }}
        >
          <Search size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { setSearchFocused(true); setView('list'); }}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 12,
              fontFamily: 'var(--font-family)',
              color: 'var(--color-text-primary)',
              padding: 0,
            }}
          />
        </div>
      </div>

      {/* Quick links */}
      <div style={{ padding: '8px 8px 0 8px' }}>
        <QuickLink
          icon={<Trash2 size={14} />}
          label="Trash"
          active={view === 'trash'}
          onClick={() => setView(view === 'trash' ? 'list' : 'trash')}
          badge={archivedDrawings.length > 0 ? archivedDrawings.length : undefined}
        />
      </div>

      {/* Separator */}
      <div
        style={{
          height: 1,
          background: 'var(--color-border-primary)',
          margin: '8px 12px',
          flexShrink: 0,
        }}
      />

      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 12px',
          marginBottom: 2,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {view === 'trash' ? 'Trash' : 'Drawings'}
        </span>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 4px 8px 4px',
        }}
      >
        {isLoading ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
              fontSize: 12,
            }}
          >
            Loading...
          </div>
        ) : view === 'list' ? (
          filteredDrawings.length === 0 ? (
            searchQuery.trim() ? (
              <div
                style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 12,
                }}
              >
                No results for "{searchQuery}"
              </div>
            ) : (
              <div
                style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 12,
                }}
              >
                No drawings yet
              </div>
            )
          ) : (
            filteredDrawings.map((drawing) => (
              <DrawingListItem
                key={drawing.id}
                drawing={drawing}
                isSelected={drawing.id === selectedId}
                onClick={() => onSelect(drawing.id)}
                onDelete={() => handleDelete(drawing.id)}
              />
            ))
          )
        ) : (
          /* Trash view */
          archivedDrawings.length === 0 ? (
            <div
              style={{
                padding: '24px 12px',
                textAlign: 'center',
                color: 'var(--color-text-tertiary)',
                fontSize: 12,
              }}
            >
              Trash is empty
            </div>
          ) : (
            archivedDrawings.map((drawing) => (
              <DrawingListItem
                key={drawing.id}
                drawing={drawing}
                isSelected={drawing.id === selectedId}
                onClick={() => onSelect(drawing.id)}
                onDelete={() => handleDelete(drawing.id)}
                onRestore={() => handleRestore(drawing.id)}
                isTrash
              />
            ))
          )
        )}
      </div>
    </div>
  );
}

// ─── Quick link (sidebar mini-nav) ───────────────────────────────────

function QuickLink({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '5px 8px',
        background: active ? 'var(--color-surface-selected)' : hovered ? 'var(--color-surface-hover)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: active || hovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        fontFamily: 'var(--font-family)',
        cursor: 'pointer',
        transition: 'background 0.12s ease',
        textAlign: 'left',
      }}
    >
      <span style={{ flexShrink: 0, color: 'var(--color-text-tertiary)' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            background: 'var(--color-bg-tertiary)',
            padding: '1px 5px',
            borderRadius: 8,
            fontWeight: 500,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <Pencil size={48} strokeWidth={1} style={{ opacity: 0.3 }} />
      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        No drawing selected
      </div>
      <div style={{ fontSize: 13, maxWidth: 280, textAlign: 'center', lineHeight: 1.5 }}>
        Select a drawing from the sidebar or create a new one to start sketching.
      </div>
      <button
        onClick={onCreate}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          background: hovered ? 'var(--color-accent-primary)' : 'var(--color-accent-subtle)',
          color: hovered ? '#fff' : 'var(--color-accent-primary)',
          border: '1px solid color-mix(in srgb, var(--color-accent-primary) 20%, transparent)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'var(--font-family)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <Plus size={15} />
        Create your first drawing
      </button>
    </div>
  );
}

// ─── Editable title header ───────────────────────────────────────────

function EditableTitle({
  title,
  onChange,
  isSaving,
}: {
  title: string;
  onChange: (title: string) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      onChange(trimmed);
    } else {
      setEditValue(title);
    }
    setEditing(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderBottom: '1px solid var(--color-border-primary)',
        background: 'var(--color-bg-secondary)',
        flexShrink: 0,
      }}
    >
      <Pencil size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setEditValue(title);
              setEditing(false);
            }
          }}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-family)',
            color: 'var(--color-text-primary)',
            padding: 0,
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            cursor: 'text',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title || 'Untitled'}
        </span>
      )}
      {isSaving && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--color-text-tertiary)',
            flexShrink: 0,
          }}
        >
          Saving...
        </span>
      )}
    </div>
  );
}

// ─── Excalidraw wrapper ──────────────────────────────────────────────

// Keys of AppState we persist (not UI-related state)
const PERSISTED_APP_STATE_KEYS = [
  'viewBackgroundColor',
  'currentItemFontFamily',
  'currentItemFontSize',
  'currentItemStrokeColor',
  'currentItemBackgroundColor',
  'currentItemFillStyle',
  'currentItemStrokeWidth',
  'currentItemRoughness',
  'currentItemOpacity',
  'currentItemEndArrowhead',
  'currentItemStartArrowhead',
  'gridSize',
  'gridStep',
  'gridModeEnabled',
] as const;

function pickAppState(appState: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of PERSISTED_APP_STATE_KEYS) {
    if (key in appState) {
      picked[key] = appState[key];
    }
  }
  return picked;
}

function ExcalidrawCanvas({
  drawing,
  onAutoSave,
  isSaving,
  onTitleChange,
}: {
  drawing: Drawing;
  onAutoSave: (content: Record<string, unknown>) => void;
  isSaving: boolean;
  onTitleChange: (title: string) => void;
}) {
  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const theme = useSettingsStore((s) => s.theme);
  const isInitialLoadRef = useRef(true);

  // Determine effective theme for Excalidraw
  const effectiveTheme = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  // Parse initial data from drawing content
  const initialData = useMemo(() => {
    const content = drawing.content as Record<string, unknown> | null;
    if (!content) return undefined;
    return {
      elements: (content.elements as unknown[]) || [],
      appState: {
        ...((content.appState as Record<string, unknown>) || {}),
        theme: effectiveTheme,
      },
      files: (content.files as Record<string, unknown>) || undefined,
    };
  }, [drawing.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>, files: unknown) => {
      // Skip the initial load callback from Excalidraw
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        return;
      }

      const persistedAppState = pickAppState(appState);
      onAutoSave({
        elements: elements as unknown as Record<string, unknown>[],
        appState: persistedAppState,
        files: files || {},
      });
    },
    [onAutoSave],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <EditableTitle
        title={drawing.title}
        onChange={onTitleChange}
        isSaving={isSaving}
      />
      <div style={{ flex: 1, position: 'relative' }}>
        <Excalidraw
          excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
            excalidrawApiRef.current = api;
          }}
          initialData={initialData as any}
          theme={effectiveTheme}
          onChange={handleChange as any}
          UIOptions={{
            canvasActions: {
              loadScene: false,
            },
          }}
        />
      </div>
    </div>
  );
}

// ─── Draw page ───────────────────────────────────────────────────────

export function DrawPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedId, setSelectedId] = useState<string | undefined>(id);
  const { data: drawing, isLoading } = useDrawing(selectedId);
  const { data: listData } = useDrawingList();
  const { save, isSaving } = useAutoSaveDrawing();
  const createDrawing = useCreateDrawing();

  // Auto-select first drawing when none is selected
  useEffect(() => {
    if (!selectedId && listData?.drawings && listData.drawings.length > 0) {
      const first = listData.drawings[0];
      setSelectedId(first.id);
      navigate(`/draw/${first.id}`, { replace: true });
    }
  }, [selectedId, listData, navigate]);

  const handleSelect = useCallback(
    (drawingId: string) => {
      setSelectedId(drawingId);
      navigate(`/draw/${drawingId}`, { replace: true });
    },
    [navigate],
  );

  const handleAutoSave = useCallback(
    (content: Record<string, unknown>) => {
      if (selectedId) {
        save(selectedId, { content });
      }
    },
    [selectedId, save],
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      if (selectedId) {
        save(selectedId, { title });
      }
    },
    [selectedId, save],
  );

  const handleCreateNew = useCallback(() => {
    createDrawing.mutate({ title: 'Untitled' }, {
      onSuccess: (d) => {
        handleSelect(d.id);
      },
    });
  }, [createDrawing, handleSelect]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        background: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <DrawSidebar
        selectedId={selectedId}
        onSelect={handleSelect}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {!selectedId ? (
          <EmptyState onCreate={handleCreateNew} />
        ) : isLoading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              fontSize: 14,
            }}
          >
            Loading...
          </div>
        ) : drawing ? (
          <ExcalidrawCanvas
            key={drawing.id}
            drawing={drawing}
            onAutoSave={handleAutoSave}
            isSaving={isSaving}
            onTitleChange={handleTitleChange}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              fontSize: 14,
            }}
          >
            Drawing not found
          </div>
        )}
      </div>
    </div>
  );
}
