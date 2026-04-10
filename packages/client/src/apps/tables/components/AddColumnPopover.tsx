import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { TableFieldType } from '@atlas-platform/shared';
import { FIELD_TYPES } from '../lib/table-constants';
import { FIELD_TYPE_ICONS } from '../../../lib/field-type-icons';
import { Button } from '../../../components/ui/button';

export function AddColumnPopover({
  onAdd,
  onClose,
  tables,
}: {
  onAdd: (name: string, type: TableFieldType, options?: string[], linkedTableId?: string) => void;
  onClose: () => void;
  tables?: Array<{ id: string; title: string }>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<TableFieldType>('text');
  const [options, setOptions] = useState('');
  const [linkedTableId, setLinkedTableId] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close type dropdown on Escape
  useEffect(() => {
    if (!showTypeDropdown) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setShowTypeDropdown(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showTypeDropdown]);

  const needsOptions = type === 'singleSelect' || type === 'multiSelect';
  const needsLinkedTable = type === 'linkedRecord';
  const selectedFieldType = FIELD_TYPES.find((ft) => ft.value === type);
  const TypeIcon = FIELD_TYPE_ICONS[type];

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (needsLinkedTable && !linkedTableId) return;
    const opts = needsOptions
      ? options.split(',').map((o) => o.trim()).filter(Boolean)
      : undefined;
    onAdd(name.trim(), type, opts, needsLinkedTable ? linkedTableId : undefined);
    onClose();
  };

  return (
    <div ref={popoverRef} className="tables-add-col-popover" onClick={(e) => e.stopPropagation()}>
      <div>
        <label>{t('tables.columnName')}</label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('tables.columnNamePlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      </div>
      <div style={{ position: 'relative' }} ref={typeDropdownRef}>
        <label>{t('tables.fieldType')}</label>
        <button
          className="tables-field-type-trigger"
          onClick={() => setShowTypeDropdown(!showTypeDropdown)}
          type="button"
        >
          <TypeIcon size={14} />
          <span>{selectedFieldType?.label}</span>
          <ChevronDown size={14} />
        </button>
        {showTypeDropdown && (
          <div className="tables-field-type-dropdown">
            {FIELD_TYPES.map((ft) => {
              const Icon = FIELD_TYPE_ICONS[ft.value];
              return (
                <button
                  key={ft.value}
                  className={`tables-field-type-option${ft.value === type ? ' selected' : ''}`}
                  onClick={() => { setType(ft.value); setShowTypeDropdown(false); }}
                  type="button"
                >
                  <Icon size={14} />
                  <span>{ft.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {needsOptions && (
        <div>
          <label>{t('tables.options')}</label>
          <input
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder={t('tables.optionsPlaceholder')}
          />
        </div>
      )}
      {needsLinkedTable && (
        <div>
          <label>{t('tables.fields.selectTable')}</label>
          <select
            value={linkedTableId}
            onChange={(e) => setLinkedTableId(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-primary)',
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
            }}
          >
            <option value="">{t('tables.fields.selectTable')}</option>
            {(tables ?? []).map((tbl) => (
              <option key={tbl.id} value={tbl.id}>{tbl.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="tables-add-col-actions">
        <Button variant="secondary" size="sm" onClick={onClose}>{t('tables.cancel')}</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit}>{t('tables.addColumn')}</Button>
      </div>
    </div>
  );
}
