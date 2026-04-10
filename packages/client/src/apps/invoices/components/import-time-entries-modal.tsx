import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { Modal } from '../../../components/ui/modal';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { useToastStore } from '../../../stores/toast-store';
import {
  usePreviewTimeEntries,
  usePopulateFromTimeEntries,
  type TimeEntryLineItemPreview,
} from '../../projects/hooks';

interface ImportTimeEntriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  companyId: string;
  currency?: string;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - 90);
  return { from: isoDate(past), to: isoDate(today) };
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: 'var(--spacing-xs) var(--spacing-sm)',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontFamily: 'var(--font-family)',
  borderBottom: '1px solid var(--color-border-secondary)',
  background: 'var(--color-bg-secondary)',
  position: 'sticky',
  top: 0,
};

const tdStyle: CSSProperties = {
  padding: 'var(--spacing-xs) var(--spacing-sm)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family)',
  borderBottom: '1px solid var(--color-border-secondary)',
  verticalAlign: 'middle',
};

export function ImportTimeEntriesModal({
  open,
  onOpenChange,
  invoiceId,
  companyId,
  currency,
}: ImportTimeEntriesModalProps) {
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const preview = usePreviewTimeEntries();
  const populate = usePopulateFromTimeEntries();

  const [range, setRange] = useState(defaultRange);
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [rows, setRows] = useState<TimeEntryLineItemPreview[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const refresh = (from: string, to: string) => {
    preview.mutate(
      { companyId, startDate: from, endDate: to },
      {
        onSuccess: (data) => {
          setRows(data);
          setSelected(new Set(data.map((r) => r.id)));
        },
        onError: () => {
          addToast({ type: 'error', message: t('common.error') });
        },
      },
    );
  };

  useEffect(() => {
    if (open && companyId) {
      const r = defaultRange();
      setRange(r);
      setProjectFilter('');
      setRows([]);
      setSelected(new Set());
      refresh(r.from, r.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyId]);

  const filteredRows = useMemo(
    () => (projectFilter ? rows.filter((r) => r.projectId === projectFilter) : rows),
    [rows, projectFilter],
  );

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.projectId, r.projectName || r.projectId);
    return [
      { value: '', label: t('invoices.importTime.allProjects') },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [rows, t]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const allSelected = filteredRows.every((r) => selected.has(r.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const r of filteredRows) next.delete(r.id);
      } else {
        for (const r of filteredRows) next.add(r.id);
      }
      return next;
    });
  };

  const selectedRows = filteredRows.filter((r) => selected.has(r.id));
  const totalAmount = selectedRows.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);
  const currencyLabel = currency || '';

  const handleSubmit = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    populate.mutate(
      {
        invoiceId,
        companyId,
        startDate: range.from,
        endDate: range.to,
        timeEntryIds: ids,
      },
      {
        onSuccess: () => {
          addToast({
            type: 'success',
            message: t('invoices.importTime.importSuccess', { count: ids.length }),
          });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const reason =
            (err as { message?: string })?.message ?? t('common.error');
          addToast({
            type: 'error',
            message: t('invoices.importTime.importFailed', { reason }),
          });
        },
      },
    );
  };

  const isLoading = preview.isPending;
  const isSubmitting = populate.isPending;
  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.id));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      width={680}
      title={t('invoices.importTime.importTimeEntries')}
    >
      <Modal.Header title={t('invoices.importTime.importTimeEntries')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-sm)',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {t('invoices.importTime.from')}
              </label>
              <Input
                type="date"
                size="sm"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {t('invoices.importTime.to')}
              </label>
              <Input
                type="date"
                size="sm"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', minWidth: 180 }}>
              <label
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {t('invoices.importTime.projectFilter')}
              </label>
              <Select
                size="sm"
                value={projectFilter}
                onChange={setProjectFilter}
                options={projectOptions}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={() => refresh(range.from, range.to)}
              disabled={isLoading}
            >
              {t('invoices.importTime.refresh')}
            </Button>
          </div>

          <div
            style={{
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-md)',
              overflow: 'auto',
              maxHeight: 360,
            }}
          >
            {filteredRows.length === 0 && !isLoading ? (
              <div
                style={{
                  padding: 'var(--spacing-lg)',
                  textAlign: 'center',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {t('invoices.importTime.noUnbilledEntries')}
              </div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: 'var(--font-family)',
                }}
              >
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 32 }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        aria-label="toggle-all"
                      />
                    </th>
                    <th style={thStyle}>{t('invoices.importTime.tableHeaderProject')}</th>
                    <th style={thStyle}>{t('invoices.importTime.tableHeaderDate')}</th>
                    <th style={thStyle}>{t('invoices.importTime.tableHeaderDescription')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>
                      {t('invoices.importTime.tableHeaderHours')}
                    </th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>
                      {t('invoices.importTime.tableHeaderRate')}
                    </th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>
                      {t('invoices.importTime.tableHeaderAmount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const amount = row.quantity * row.unitPrice;
                    return (
                      <tr key={row.id}>
                        <td style={tdStyle}>
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={() => toggle(row.id)}
                          />
                        </td>
                        <td style={tdStyle}>{row.projectName}</td>
                        <td style={tdStyle}>{row.workDate}</td>
                        <td style={tdStyle}>{row.description}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {row.quantity.toFixed(2)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {row.unitPrice.toFixed(2)}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                          }}
                        >
                          {amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family)',
            }}
          >
            <span>
              {t('invoices.importTime.selectedSummary', {
                selected: selectedRows.length,
                total: filteredRows.length,
              })}
            </span>
            <span
              style={{
                fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
              }}
            >
              {t('invoices.importTime.totalLabel')}:{' '}
              {totalAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {currencyLabel}
            </span>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          {t('invoices.importTime.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting || selectedRows.length === 0}
        >
          {t('invoices.importTime.addToInvoice')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
