import { useTranslation } from 'react-i18next';
import {
  Download, Upload, FileSpreadsheet, Layers,
} from 'lucide-react';
import type { ActiveView, SortState } from '../lib/crm-helpers';
import type { CrmFilter, FilterColumn } from './filter-bar';
import { FilterBar } from './filter-bar';
import { SavedViews, type SavedView } from './saved-views';
import { Button } from '../../../components/ui/button';
import { ListToolbar } from '../../../components/ui/list-toolbar';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';

export function CrmToolbar({
  activeView,
  importEntityType,
  filters, onFiltersChange,
  currentFilterColumns,
  sort, onApplyView,
  groupBy, onGroupByChange,
  onImport, onExport,
}: {
  activeView: ActiveView;
  importEntityType: 'deals' | 'contacts' | 'companies';
  filters: CrmFilter[];
  onFiltersChange: (filters: CrmFilter[]) => void;
  currentFilterColumns: FilterColumn[];
  sort: SortState | null;
  onApplyView: (view: SavedView) => void;
  groupBy: string | null;
  onGroupByChange: (groupBy: string | null) => void;
  onImport: () => void;
  onExport: (format: 'csv' | 'xlsx' | 'json') => void;
}) {
  const { t } = useTranslation();

  if (activeView !== 'deals' && activeView !== 'contacts' && activeView !== 'companies') {
    return null;
  }

  return (
    <ListToolbar
      actions={
        <>
          <Button variant="ghost" size="sm" icon={<Upload size={13} />} onClick={onImport}>
            {t('crm.actions.import')}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" icon={<Download size={13} />}>
                {t('crm.actions.export')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" style={{ padding: 'var(--spacing-xs)', minWidth: 130 }}>
              {(['csv', 'xlsx', 'json'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => onExport(fmt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
                    width: '100%', padding: '6px var(--spacing-sm)',
                    background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-family)', cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <FileSpreadsheet size={13} style={{ color: 'var(--color-text-tertiary)' }} />
                  {fmt.toUpperCase()}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </>
      }
    >
      <SavedViews
        entityType={importEntityType}
        currentFilters={filters}
        currentSort={sort}
        onApplyView={onApplyView}
      />
      <ListToolbar.Separator />
      {/* Group by dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={groupBy ? 'secondary' : 'ghost'} size="sm" icon={<Layers size={13} />}>
            {t('crm.list.groupBy')}{groupBy ? `: ${groupBy}` : ''}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" style={{ padding: 'var(--spacing-xs)', minWidth: 150 }}>
          {[
            { value: null, label: t('crm.list.noGrouping') },
            ...(activeView === 'deals' ? [
              { value: 'stage', label: t('crm.deals.groupByStage') },
              { value: 'contact', label: t('crm.deals.groupByContact') },
              { value: 'company', label: t('crm.deals.groupByCompany') },
            ] : activeView === 'contacts' ? [
              { value: 'company', label: t('crm.contacts.groupByCompany') },
            ] : [
              { value: 'industry', label: t('crm.companies.groupByIndustry') },
            ]),
          ].map((opt) => (
            <button
              key={opt.value ?? 'none'}
              onClick={() => onGroupByChange(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
                width: '100%', padding: '6px var(--spacing-sm)',
                background: groupBy === opt.value ? 'var(--color-surface-selected)' : 'transparent',
                border: 'none', borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = groupBy === opt.value ? 'var(--color-surface-selected)' : 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <ListToolbar.Separator />
      <FilterBar
        columns={currentFilterColumns}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
    </ListToolbar>
  );
}
