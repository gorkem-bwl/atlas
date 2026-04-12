import { useTranslation } from 'react-i18next';
import { Paintbrush, Check } from 'lucide-react';
import type { TableColumn, TableViewConfig } from '@atlas-platform/shared';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';
import { Select } from '../../../components/ui/select';

interface RowColorPopoverProps {
  columns: TableColumn[];
  viewConfig: TableViewConfig;
  onUpdate: (mode: 'none' | 'bySelectField', columnId?: string) => void;
}

export function RowColorPopover({ columns, viewConfig, onUpdate }: RowColorPopoverProps) {
  const { t } = useTranslation();
  const mode = viewConfig.rowColorMode || 'none';
  const selectedColId = viewConfig.rowColorColumnId || '';
  const selectColumns = columns.filter((c) => c.type === 'singleSelect');
  const isActive = mode === 'bySelectField';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`tables-toolbar-btn${isActive ? ' active' : ''}`}
          title={t('tables.rowColor')}
        >
          <Paintbrush size={14} />
          {t('tables.rowColor')}
        </button>
      </PopoverTrigger>
      <PopoverContent sideOffset={4} align="start" minWidth={220} style={{ padding: 8 }}>
        <div className="popover-header">{t('tables.rowColor')}</div>

        <button
          className={`context-menu-item${mode === 'none' ? ' active' : ''}`}
          onClick={() => onUpdate('none')}
        >
          {mode === 'none' && <Check size={14} />}
          <span>{t('tables.noColor')}</span>
        </button>

        <button
          className={`context-menu-item${mode === 'bySelectField' ? ' active' : ''}`}
          onClick={() => {
            const col = selectColumns[0];
            if (col) onUpdate('bySelectField', col.id);
          }}
          disabled={selectColumns.length === 0}
        >
          {mode === 'bySelectField' && <Check size={14} />}
          <span>{t('tables.bySelectField')}</span>
        </button>

        {mode === 'bySelectField' && selectColumns.length > 0 && (
          <div style={{ padding: '6px 10px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 4 }}>
              {t('tables.selectColorColumn')}
            </label>
            <Select
              value={selectedColId}
              onChange={(v) => onUpdate('bySelectField', v)}
              options={selectColumns.map((c) => ({ value: c.id, label: c.name }))}
              size="sm"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
