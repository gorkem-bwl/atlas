import { useTranslation } from 'react-i18next';
import * as Popover from '@radix-ui/react-popover';
import { Paintbrush, Check } from 'lucide-react';
import type { TableColumn, TableViewConfig } from '@atlasmail/shared';

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
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={`tables-toolbar-btn${isActive ? ' active' : ''}`}
          title={t('tables.rowColor')}
        >
          <Paintbrush size={14} />
          {t('tables.rowColor')}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="tables-popover-content" sideOffset={4} align="start" style={{ minWidth: 220 }}>
          <div className="tables-popover-header">{t('tables.rowColor')}</div>

          <button
            className={`tables-context-menu-item${mode === 'none' ? ' active' : ''}`}
            onClick={() => onUpdate('none')}
          >
            {mode === 'none' && <Check size={14} />}
            <span>{t('tables.noColor')}</span>
          </button>

          <button
            className={`tables-context-menu-item${mode === 'bySelectField' ? ' active' : ''}`}
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
              <select
                value={selectedColId}
                onChange={(e) => onUpdate('bySelectField', e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--radius-md, 4px)',
                  background: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {selectColumns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
