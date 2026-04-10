import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Plus, X } from 'lucide-react';
import type { TableColumn, TableViewConfig } from '@atlas-platform/shared';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';
import { Select } from '../../../components/ui/select';

interface SortRule {
  columnId: string;
  direction: 'asc' | 'desc';
}

interface SortPopoverProps {
  columns: TableColumn[];
  viewConfig: TableViewConfig;
  onUpdate: (sorts: SortRule[]) => void;
}

export function SortPopover({ columns, viewConfig, onUpdate }: SortPopoverProps) {
  const { t } = useTranslation();
  const sorts = viewConfig.sorts || [];

  const handleAdd = () => {
    if (columns.length === 0) return;
    onUpdate([...sorts, { columnId: columns[0].id, direction: 'asc' }]);
  };

  const handleRemove = (idx: number) => {
    onUpdate(sorts.filter((_, i) => i !== idx));
  };

  const handleChange = (idx: number, field: 'columnId' | 'direction', value: string) => {
    const updated = sorts.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s,
    );
    onUpdate(updated);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`tables-toolbar-btn${sorts.length > 0 ? ' active' : ''}`}
          title={t('tables.sort')}
        >
          <ArrowUpDown size={14} />
          {t('tables.sort')}
          {sorts.length > 0 && <span className="tables-toolbar-badge">{sorts.length}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent sideOffset={4} align="start" style={{ padding: 8 }}>
        <div className="popover-header">
          <span>{t('tables.sort')}</span>
        </div>

        {sorts.length === 0 ? (
          <div className="tables-popover-empty">{t('tables.noSorts')}</div>
        ) : (
          <div className="tables-popover-list">
            {sorts.map((sort, idx) => (
              <div key={idx} className="tables-popover-rule">
                <Select
                  value={sort.columnId}
                  onChange={(v) => handleChange(idx, 'columnId', v)}
                  options={columns.map((col) => ({ value: col.id, label: col.name }))}
                  size="sm"
                />
                <Select
                  value={sort.direction}
                  onChange={(v) => handleChange(idx, 'direction', v)}
                  options={[
                    { value: 'asc', label: t('tables.ascending') },
                    { value: 'desc', label: t('tables.descending') },
                  ]}
                  size="sm"
                />
                <button className="tables-popover-rule-remove" onClick={() => handleRemove(idx)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="tables-popover-add" onClick={handleAdd}>
          <Plus size={14} />
          {t('tables.addSort')}
        </button>
      </PopoverContent>
    </Popover>
  );
}
