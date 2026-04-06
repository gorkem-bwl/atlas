import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';
import { queryKeys } from '../../../config/query-keys';
import { widgetRegistry } from './registry';
import { appRegistry } from '../../../config/app-registry';
import { useAuthStore } from '../../../stores/auth-store';
import { useMyAccessibleApps } from '../../../hooks/use-app-permissions';

const WIDGET_W = 240;
const WIDGET_H = 160;
const GAP = 12;

type UnifiedWidget =
  | { type: 'home'; key: string; widget: (typeof widgetRegistry)[number] }
  | { type: 'app'; key: string; widget: ReturnType<typeof appRegistry.getAllWidgets>[number]; route?: string };

export function WidgetGrid() {
  const { data: settings } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as Record<string, unknown> | null;
    },
    staleTime: 60_000,
  });

  const enabledWidgets = useMemo(() => {
    const raw = settings?.homeEnabledWidgets;
    let enabledIds: string[] | null = null;

    if (Array.isArray(raw)) {
      enabledIds = raw as string[];
    } else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) enabledIds = parsed;
      } catch { /* use defaults */ }
    }

    if (enabledIds === null) {
      return widgetRegistry.filter((w) => w.defaultEnabled);
    }

    return widgetRegistry.filter((w) => enabledIds!.includes(w.id));
  }, [settings]);

  // App widgets enabled for the home screen
  const enabledAppWidgets = useMemo(() => {
    const all = appRegistry.getAllWidgets();
    const raw = settings?.homeEnabledWidgets;
    let enabledIds: string[] | null = null;

    if (Array.isArray(raw)) {
      enabledIds = raw as string[];
    } else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) enabledIds = parsed;
      } catch { /* ignore */ }
    }

    if (enabledIds === null) {
      // By default, show app widgets that are defaultEnabled
      return all.filter((w) => w.defaultEnabled);
    }

    // Prefix app widget IDs with appId: to distinguish from home widgets
    return all.filter((w) => enabledIds!.includes(`${w.appId}:${w.id}`));
  }, [settings]);

  // Role-based widget filtering using accessible apps
  const tenantRole = useAuthStore((s) => s.tenantRole);
  const isAdmin = tenantRole === 'owner' || tenantRole === 'admin';
  const { data: myApps } = useMyAccessibleApps();

  const filteredAppWidgets = useMemo(() => {
    const accessibleSet = myApps?.appIds === '__all__'
      ? null // null means all accessible
      : new Set(myApps?.appIds ?? []);

    return enabledAppWidgets.filter(w => {
      // CPU/Memory: admin only
      if (w.id === 'cpu-usage' || w.id === 'memory-usage') return isAdmin;
      // If not admin, only show widgets for apps user has explicit access to
      if (accessibleSet && !accessibleSet.has(w.appId)) return false;
      return true;
    });
  }, [enabledAppWidgets, isAdmin, myApps]);

  const navigate = useNavigate();
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null);

  // --- Drag-and-drop state ---
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Parse saved widget order from settings
  const widgetOrder = useMemo(() => {
    const raw = settings?.homeWidgetOrder;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) as string[]; } catch { return null; }
    }
    if (Array.isArray(raw)) return raw as string[];
    return null;
  }, [settings]);

  // Local order state for instant feedback before server round-trip
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const hasWidgets = enabledWidgets.length > 0 || filteredAppWidgets.length > 0;

  const visibleWidgets = enabledWidgets.slice(0, 10);

  // Combine all widgets into a single ordered array
  const allWidgets: UnifiedWidget[] = useMemo(() => {
    const homeItems: UnifiedWidget[] = visibleWidgets.map((w) => ({
      type: 'home' as const,
      key: w.id,
      widget: w,
    }));

    const appItems: UnifiedWidget[] = filteredAppWidgets.map((w) => {
      const app = appRegistry.getAll().find((a) => a.id === w.appId);
      const route = app?.routes[0]?.path;
      return {
        type: 'app' as const,
        key: `${w.appId}:${w.id}`,
        widget: w,
        route,
      };
    });

    return [...homeItems, ...appItems];
  }, [visibleWidgets, filteredAppWidgets]);

  // Sort widgets by saved order (local override > server setting > default)
  const orderedWidgets = useMemo(() => {
    const order = localOrder ?? widgetOrder;
    if (!order) return allWidgets;
    const orderMap = new Map(order.map((id, i) => [id, i]));
    return [...allWidgets].sort((a, b) => {
      const aIdx = orderMap.get(a.key) ?? 999;
      const bIdx = orderMap.get(b.key) ?? 999;
      return aIdx - bIdx;
    });
  }, [allWidgets, widgetOrder, localOrder]);

  // Get current ordered keys
  const orderedWidgetKeys = useMemo(
    () => orderedWidgets.map((w) => w.key),
    [orderedWidgets],
  );

  // Handle reorder on drop
  const handleReorder = useCallback(
    (fromId: string | null, toId: string) => {
      if (!fromId || fromId === toId) return;
      const currentOrder = [...orderedWidgetKeys];
      const fromIdx = currentOrder.indexOf(fromId);
      const toIdx = currentOrder.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return;
      currentOrder.splice(fromIdx, 1);
      currentOrder.splice(toIdx, 0, fromId);
      setLocalOrder(currentOrder);
      // Persist to server
      api.put('/settings', { homeWidgetOrder: JSON.stringify(currentOrder) }).catch(() => {});
      // Delay state reset so animation completes
      setTimeout(() => {
        setDraggedId(null);
        setDragOverId(null);
      }, 250);
    },
    [orderedWidgetKeys],
  );

  if (!hasWidgets) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, ${WIDGET_W}px)`,
          gap: GAP,
          justifyContent: 'center',
          width: '100%',
          maxWidth: '90vw',
        }}
      >
        {orderedWidgets.map((item) => {
          const isDragged = draggedId === item.key;
          const isDragOver = dragOverId === item.key && draggedId !== item.key;

          if (item.type === 'home') {
            return (
              <div
                key={item.key}
                draggable
                onDragStart={(e) => {
                  setDraggedId(item.key);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  if (draggedId && dragOverId && draggedId !== dragOverId) {
                    handleReorder(draggedId, dragOverId);
                  } else {
                    setDraggedId(null);
                    setDragOverId(null);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverId(item.key);
                }}
                onDrop={(e) => { e.preventDefault(); }}
                style={{
                  width: WIDGET_W,
                  height: WIDGET_H,
                  background: 'rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: isDragOver
                    ? '1px solid rgba(255,255,255,0.4)'
                    : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  opacity: isDragged ? 0.3 : 1,
                  cursor: isDragged ? 'grabbing' : 'grab',
                  transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1), opacity 0.15s, border-color 0.15s',
                  transform: isDragOver ? 'scale(1.03)' : 'scale(1)',
                }}
              >
                <item.widget.component width={WIDGET_W} height={WIDGET_H} />
              </div>
            );
          }

          // App widget
          const isHovered = hoveredWidget === item.key;
          return (
            <div
              key={item.key}
              draggable
              onDragStart={(e) => {
                setDraggedId(item.key);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                if (draggedId && dragOverId && draggedId !== dragOverId) {
                  handleReorder(draggedId, dragOverId);
                } else {
                  setDraggedId(null);
                  setDragOverId(null);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverId(item.key);
              }}
              onDrop={(e) => { e.preventDefault(); }}
              onClick={() => !draggedId && item.route && navigate(item.route)}
              onMouseEnter={() => setHoveredWidget(item.key)}
              onMouseLeave={() => setHoveredWidget(null)}
              style={{
                width: WIDGET_W,
                height: WIDGET_H,
                background: 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: isDragOver
                  ? '1px solid rgba(255,255,255,0.4)'
                  : isHovered
                    ? '1px solid rgba(255,255,255,0.25)'
                    : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                opacity: isDragged ? 0.3 : 1,
                cursor: isDragged ? 'grabbing' : 'grab',
                transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1), opacity 0.15s, border-color 0.15s',
                transform: isDragOver ? 'scale(1.03)' : isHovered && !isDragged ? 'translateY(-2px)' : 'none',
              }}
            >
              <item.widget.component width={WIDGET_W} height={WIDGET_H} appId={item.widget.appId} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
