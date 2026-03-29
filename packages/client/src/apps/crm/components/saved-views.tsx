import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Save, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';
import type { CrmFilter } from './filter-bar';

// ─── Types ──────────────────────────────────────────────────────────

export interface SavedView {
  id: string;
  name: string;
  entityType: 'deals' | 'contacts' | 'companies';
  filters: CrmFilter[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
}

interface SavedViewsProps {
  entityType: 'deals' | 'contacts' | 'companies';
  currentFilters: CrmFilter[];
  currentSort: { column: string; direction: 'asc' | 'desc' } | null;
  onApplyView: (view: SavedView) => void;
}

// ─── Local storage helpers ──────────────────────────────────────────

const STORAGE_KEY = 'atlas_crm_saved_views';

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedView[];
  } catch {
    return [];
  }
}

function saveViews(views: SavedView[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
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
  const [views, setViews] = useState<SavedView[]>(loadViews);

  const entityViews = useMemo(() =>
    views.filter((v) => v.entityType === entityType),
    [views, entityType],
  );

  const handleSave = useCallback(() => {
    if (!viewName.trim()) return;
    const newView: SavedView = {
      id: generateId(),
      name: viewName.trim(),
      entityType,
      filters: currentFilters,
      sortColumn: currentSort?.column ?? null,
      sortDirection: currentSort?.direction ?? 'asc',
    };
    const updated = [...views, newView];
    setViews(updated);
    saveViews(updated);
    setViewName('');
    setShowSaveModal(false);
  }, [viewName, entityType, currentFilters, currentSort, views]);

  const handleDelete = useCallback((id: string) => {
    const updated = views.filter((v) => v.id !== id);
    setViews(updated);
    saveViews(updated);
  }, [views]);

  const handleApply = useCallback((view: SavedView) => {
    onApplyView(view);
    setOpen(false);
  }, [onApplyView]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" icon={<Eye size={13} />}>
            {t('crm.actions.saveView')}
            <ChevronDown size={11} style={{ marginLeft: 2 }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent width={260} align="start">
          <div style={{ padding: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-tertiary)', padding: 'var(--spacing-xs) var(--spacing-sm)',
              textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-family)',
            }}>
              {t('crm.actions.saveView')}
            </div>

            {entityViews.length === 0 && (
              <div style={{
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
                padding: 'var(--spacing-sm)', fontFamily: 'var(--font-family)',
                textAlign: 'center',
              }}>
                {t('crm.actions.saveView')}
              </div>
            )}

            {entityViews.map((view) => (
              <div
                key={view.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px var(--spacing-sm)', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', gap: 'var(--spacing-sm)',
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
                  {view.name}
                </span>
                <span style={{
                  fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-family)', flexShrink: 0,
                }}>
                  {view.filters.length} filter{view.filters.length !== 1 ? 's' : ''}
                </span>
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
            ))}

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
                {t('crm.actions.saveView')}
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Save view modal */}
      <Modal open={showSaveModal} onOpenChange={setShowSaveModal} width={380} title={t('crm.actions.saveView')}>
        <Modal.Header title={t('crm.actions.saveView')} />
        <Modal.Body>
          <Input
            label="View name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="My custom view"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => { setShowSaveModal(false); setViewName(''); }}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleSave} disabled={!viewName.trim()}>{t('crm.actions.saveView')}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
