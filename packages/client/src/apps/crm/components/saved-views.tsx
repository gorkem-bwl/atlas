import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Save, Trash2, ChevronDown, Pin, PinOff, Share2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';
import { useSavedViews, useCreateSavedView, useDeleteSavedView, useUpdateSavedView, type CrmSavedView } from '../hooks';
import type { CrmFilter } from './filter-bar';

// ─── Types ──────────────────────────────────────────────────────────

export interface SavedView {
  id: string;
  name: string;
  entityType: 'deals' | 'contacts' | 'companies';
  filters: CrmFilter[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  isPinned?: boolean;
  isShared?: boolean;
}

interface SavedViewsProps {
  entityType: 'deals' | 'contacts' | 'companies';
  currentFilters: CrmFilter[];
  currentSort: { column: string; direction: 'asc' | 'desc' } | null;
  onApplyView: (view: SavedView) => void;
}

// ─── Helper to convert server view to local format ──────────────────

function serverToLocal(sv: CrmSavedView): SavedView {
  const f = sv.filters as Record<string, unknown>;
  return {
    id: sv.id,
    name: sv.name,
    entityType: sv.appSection as 'deals' | 'contacts' | 'companies',
    filters: (f.filters ?? []) as CrmFilter[],
    sortColumn: (f.sortColumn as string) ?? null,
    sortDirection: (f.sortDirection as 'asc' | 'desc') ?? 'asc',
    isPinned: sv.isPinned,
    isShared: sv.isShared,
  };
}

// ─── SavedViews component ───────────────────────────────────────────

export function SavedViews({
  entityType,
  currentFilters,
  currentSort,
  onApplyView,
}: SavedViewsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [viewName, setViewName] = useState('');

  const { data: viewsData } = useSavedViews(entityType);
  const createView = useCreateSavedView();
  const deleteView = useDeleteSavedView();
  const updateView = useUpdateSavedView();

  const entityViews = useMemo(() =>
    (viewsData?.views ?? []).map(serverToLocal),
    [viewsData],
  );

  const handleSave = useCallback(() => {
    if (!viewName.trim()) return;
    createView.mutate({
      appSection: entityType,
      name: viewName.trim(),
      filters: {
        filters: currentFilters,
        sortColumn: currentSort?.column ?? null,
        sortDirection: currentSort?.direction ?? 'asc',
      },
    });
    setViewName('');
    setShowSaveModal(false);
  }, [viewName, entityType, currentFilters, currentSort, createView]);

  const handleDelete = useCallback((id: string) => {
    deleteView.mutate(id);
  }, [deleteView]);

  const handleTogglePin = useCallback((view: CrmSavedView) => {
    updateView.mutate({ id: view.id, isPinned: !view.isPinned });
  }, [updateView]);

  const handleApply = useCallback((view: SavedView) => {
    onApplyView(view);
    setOpen(false);
  }, [onApplyView]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" icon={<Eye size={13} />}>
            {t('crm.savedViews.views')}
            <ChevronDown size={11} style={{ marginLeft: 2 }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent width={280} align="start">
          <div style={{ padding: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-tertiary)', padding: 'var(--spacing-xs) var(--spacing-sm)',
              textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-family)',
            }}>
              {t('crm.savedViews.savedViews')}
            </div>

            {entityViews.length === 0 && (
              <div style={{
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
                padding: 'var(--spacing-sm)', fontFamily: 'var(--font-family)',
                textAlign: 'center',
              }}>
                {t('crm.savedViews.noViews')}
              </div>
            )}

            {entityViews.map((view) => {
              const serverView = viewsData?.views?.find((v) => v.id === view.id);
              return (
                <div
                  key={view.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px var(--spacing-sm)', borderRadius: 'var(--radius-md)',
                    cursor: 'pointer', gap: 'var(--spacing-xs)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => handleApply(view)}
                >
                  <span style={{
                    fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {view.isPinned && <Pin size={10} style={{ marginRight: 4, color: 'var(--color-accent-primary)' }} />}
                    {view.name}
                  </span>
                  <span style={{
                    fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-family)', flexShrink: 0,
                  }}>
                    {view.filters.length} {t('crm.savedViews.filterCount', { count: view.filters.length })}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (serverView) handleTogglePin(serverView); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: view.isPinned ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
                      padding: 2, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    }}
                    title={view.isPinned ? t('crm.savedViews.unpin') : t('crm.savedViews.pin')}
                  >
                    {view.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(view.id); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-tertiary)', padding: 2, borderRadius: 'var(--radius-sm)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-error)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}

            <div style={{ borderTop: '1px solid var(--color-border-secondary)', marginTop: 'var(--spacing-xs)', paddingTop: 'var(--spacing-xs)' }}>
              <button
                onClick={() => { setOpen(false); setShowSaveModal(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
                  padding: '6px var(--spacing-sm)', borderRadius: 'var(--radius-md)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-primary)',
                  fontFamily: 'var(--font-family)', width: '100%', textAlign: 'left',
                  fontWeight: 'var(--font-weight-medium)' as unknown as number,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Save size={13} />
                {t('crm.savedViews.saveCurrentView')}
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Save view modal */}
      <Modal open={showSaveModal} onOpenChange={setShowSaveModal} width={380} title={t('crm.savedViews.saveCurrentView')}>
        <Modal.Header title={t('crm.savedViews.saveCurrentView')} />
        <Modal.Body>
          <Input
            label={t('crm.savedViews.viewName')}
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder={t('crm.savedViews.viewNamePlaceholder')}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => { setShowSaveModal(false); setViewName(''); }}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleSave} disabled={!viewName.trim()}>{t('crm.savedViews.save')}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// ─── Sidebar pinned views helper ────────────────────────────────────

export function usePinnedViews(appSection: string): SavedView[] {
  const { data: viewsData } = useSavedViews(appSection);
  return useMemo(() =>
    (viewsData?.views ?? [])
      .filter((v) => v.isPinned)
      .map(serverToLocal),
    [viewsData],
  );
}
