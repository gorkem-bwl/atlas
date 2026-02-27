import { useTranslation } from 'react-i18next';
import * as Popover from '@radix-ui/react-popover';
import { Rows3, Check } from 'lucide-react';
import type { TableViewConfig } from '@atlasmail/shared';

type RowHeightKey = 'short' | 'medium' | 'tall' | 'extraTall';

const ROW_HEIGHT_OPTIONS: { key: RowHeightKey; labelKey: string; px: number }[] = [
  { key: 'short', labelKey: 'tables.short', px: 28 },
  { key: 'medium', labelKey: 'tables.medium', px: 36 },
  { key: 'tall', labelKey: 'tables.tall', px: 52 },
  { key: 'extraTall', labelKey: 'tables.extraTall', px: 72 },
];

interface RowHeightPopoverProps {
  viewConfig: TableViewConfig;
  onUpdate: (rowHeight: RowHeightKey) => void;
}

export function RowHeightPopover({ viewConfig, onUpdate }: RowHeightPopoverProps) {
  const { t } = useTranslation();
  const current = viewConfig.rowHeight || 'medium';

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="tables-toolbar-btn" title={t('tables.rowHeight')}>
          <Rows3 size={14} />
          {t('tables.rowHeight')}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="tables-popover-content" sideOffset={4} align="start" style={{ minWidth: 180 }}>
          <div className="tables-popover-header">{t('tables.rowHeight')}</div>
          {ROW_HEIGHT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`tables-context-menu-item${current === opt.key ? ' active' : ''}`}
              onClick={() => onUpdate(opt.key)}
            >
              {current === opt.key && <Check size={14} />}
              <span>{t(opt.labelKey)}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-tertiary)' }}>{opt.px}px</span>
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
