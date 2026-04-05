import { useTranslation } from 'react-i18next';
import type { TableFieldType } from '@atlasmail/shared';
import { Modal } from '../../../components/ui/modal';
import { Button } from '../../../components/ui/button';
import { Select } from '../../../components/ui/select';

export interface ImportModalData {
  fileName: string;
  allRows: unknown[][];
  firstRowHeader: boolean;
  columnMappings: { name: string; type: TableFieldType }[];
}

export function ImportModal({
  data,
  onDataChange,
  onConfirm,
  onClose,
}: {
  data: ImportModalData;
  onDataChange: (updater: (prev: ImportModalData | null) => ImportModalData | null) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) onClose(); }}
      width="90vw"
      maxWidth={800}
      title={t('tables.import.title')}
    >
      <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* First row is header toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={data.firstRowHeader}
            onChange={(e) => {
              const checked = e.target.checked;
              onDataChange((prev) => {
                if (!prev) return prev;
                const headerRow = checked
                  ? (prev.allRows[0] as unknown[]).map((h) => String(h || 'Column'))
                  : (prev.allRows[0] as unknown[]).map((_, i) => `Column ${i + 1}`);
                const dataRows = checked ? prev.allRows.slice(1) : prev.allRows;
                const columnMappings = headerRow.map((name, idx) => {
                  const sampleValues = dataRows.slice(0, 10).map((r) => (r as unknown[])[idx]).filter(Boolean);
                  let type = prev.columnMappings[idx]?.type ?? ('text' as TableFieldType);
                  if (sampleValues.length > 0 && sampleValues.every((v) => typeof v === 'number' || !isNaN(Number(v)))) {
                    type = 'number';
                  }
                  return { name: String(name), type };
                });
                return { ...prev, firstRowHeader: checked, columnMappings };
              });
            }}
            style={{ width: 16, height: 16 }}
          />
          {t('tables.import.firstRowHeader')}
        </label>

        {/* Column mappings */}
        <div style={{ border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{t('tables.column')}</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{t('tables.fieldType')}</th>
              </tr>
            </thead>
            <tbody>
              {data.columnMappings.map((col, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border-secondary)', color: 'var(--color-text-primary)' }}>{col.name}</td>
                  <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border-secondary)' }}>
                    <Select
                      value={col.type}
                      onChange={(val) => {
                        onDataChange((prev) => {
                          if (!prev) return prev;
                          const updated = [...prev.columnMappings];
                          updated[idx] = { ...updated[idx], type: val as TableFieldType };
                          return { ...prev, columnMappings: updated };
                        });
                      }}
                      options={[
                        { value: 'text', label: 'Text' },
                        { value: 'number', label: 'Number' },
                        { value: 'checkbox', label: 'Checkbox' },
                        { value: 'date', label: 'Date' },
                        { value: 'url', label: 'URL' },
                        { value: 'email', label: 'Email' },
                      ]}
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Preview (first 5 rows) */}
        <div>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
            {t('tables.import.preview')} &mdash; {t('tables.import.rowCount', { count: data.firstRowHeader ? data.allRows.length - 1 : data.allRows.length })}
          </div>
          <div style={{ border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)', overflow: 'auto', maxHeight: 200 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family)' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {data.columnMappings.map((col, idx) => (
                    <th key={idx} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--color-border-primary)', color: 'var(--color-text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.firstRowHeader ? data.allRows.slice(1, 6) : data.allRows.slice(0, 5)).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {data.columnMappings.map((_, colIdx) => (
                      <td key={colIdx} style={{ padding: '4px 8px', borderBottom: '1px solid var(--color-border-secondary)', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {(row as unknown[])[colIdx] != null ? String((row as unknown[])[colIdx]) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
          <Button variant="secondary" size="md" onClick={onClose}>{t('tables.cancel')}</Button>
          <Button variant="primary" size="md" onClick={onConfirm}>{t('tables.import.import')}</Button>
        </div>
      </div>
    </Modal>
  );
}
