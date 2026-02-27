import { useTranslation } from 'react-i18next';
import * as Popover from '@radix-ui/react-popover';
import { EyeOff } from 'lucide-react';
import type { TableColumn, TableViewConfig } from '@atlasmail/shared';

interface HideFieldsPopoverProps {
  columns: TableColumn[];
  viewConfig: TableViewConfig;
  onUpdate: (hiddenColumns: string[]) => void;
}

export function HideFieldsPopover({ columns, viewConfig, onUpdate }: HideFieldsPopoverProps) {
  const { t } = useTranslation();
  const hidden = new Set(viewConfig.hiddenColumns || []);
  const hiddenCount = hidden.size;

  const toggle = (colId: string) => {
    const next = new Set(hidden);
    if (next.has(colId)) next.delete(colId);
    else next.add(colId);
    onUpdate(Array.from(next));
  };

  const showAll = () => onUpdate([]);
  const hideAll = () => onUpdate(columns.map((c) => c.id));

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={`tables-toolbar-btn${hiddenCount > 0 ? ' active' : ''}`}
          title={t('tables.hideFields')}
        >
          <EyeOff size={14} />
          {t('tables.hideFields')}
          {hiddenCount > 0 && <span className="tables-toolbar-badge">{hiddenCount}</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="tables-popover-content" sideOffset={4} align="start" style={{ minWidth: 220 }}>
          <div className="tables-popover-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{t('tables.hideFields')}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="tables-hide-fields-action" onClick={showAll}>{t('tables.showAll')}</button>
              <button className="tables-hide-fields-action" onClick={hideAll}>{t('tables.hideAll')}</button>
            </div>
          </div>
          <div className="tables-hide-fields-list">
            {columns.map((col) => (
              <label key={col.id} className="tables-hide-fields-item">
                <input
                  type="checkbox"
                  checked={!hidden.has(col.id)}
                  onChange={() => toggle(col.id)}
                />
                <span>{col.name}</span>
              </label>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
