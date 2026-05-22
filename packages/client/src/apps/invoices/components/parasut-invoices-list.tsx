import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Plug } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { QueryErrorState } from '../../../components/ui/query-error-state';
import { formatCurrency, formatDate } from '../../../lib/format';
import {
  useParasutConnection,
  useParasutInvoices,
  type ParasutInvoiceListItem,
} from '../hooks';
import { ParasutInvoiceDetailModal } from './parasut-invoice-detail-modal';

const PAGE_SIZE = 25;

const cellStyle: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family)',
  borderBottom: '1px solid var(--color-border-secondary)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const headStyle: React.CSSProperties = {
  ...cellStyle,
  color: 'var(--color-text-tertiary)',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  textTransform: 'uppercase',
  fontSize: 'var(--font-size-xs)',
  letterSpacing: '0.04em',
};

function statusBadge(
  status: string | null,
  t: (k: string) => string,
): React.ReactNode {
  switch (status) {
    case 'paid':
      return <Badge variant="success">{t('invoices.parasut.statusPaid')}</Badge>;
    case 'overdue':
      return <Badge variant="error">{t('invoices.parasut.statusOverdue')}</Badge>;
    case 'unpaid':
    case null:
    default:
      return <Badge variant="default">{t('invoices.parasut.statusUnpaid')}</Badge>;
  }
}

export function ParasutInvoicesList() {
  const { t } = useTranslation();
  const { data: connection } = useParasutConnection();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch, isFetching } = useParasutInvoices(page, PAGE_SIZE);

  if (!connection?.connected) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
        {t('invoices.parasut.notConnected')}
      </div>
    );
  }

  if (isError) return <QueryErrorState onRetry={() => refetch()} />;
  if (isLoading) {
    return (
      <div style={{ padding: 32, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
        {t('common.loading')}
      </div>
    );
  }

  const invoices: ParasutInvoiceListItem[] = data?.invoices ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div style={{ padding: 'var(--spacing-lg)', overflow: 'auto', flex: 1 }}>
      <div style={{
        fontSize: 'var(--font-size-md)',
        fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)',
        marginBottom: 'var(--spacing-md)',
      }}>
        {t('invoices.parasut.parasutInvoicesTitle')}
      </div>

      {invoices.length === 0 ? (
        <div style={{
          padding: 48,
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-family)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
        }}>
          <Plug size={28} />
          {t('invoices.parasut.empty')}
        </div>
      ) : (
        <>
          <div style={{ border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={headStyle}>{t('invoices.parasut.colNo')}</th>
                  <th style={headStyle}>{t('invoices.parasut.colDate')}</th>
                  <th style={headStyle}>{t('invoices.parasut.colCustomer')}</th>
                  <th style={{ ...headStyle, textAlign: 'right' }}>{t('invoices.parasut.colTotal')}</th>
                  <th style={headStyle}>{t('invoices.parasut.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={cellStyle}>{inv.invoiceNo ?? '—'}</td>
                    <td style={cellStyle}>{formatDate(inv.issueDate)}</td>
                    <td style={{ ...cellStyle, whiteSpace: 'normal' }}>{inv.contactName ?? '—'}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(inv.total, inv.currency)}</td>
                    <td style={cellStyle}>{statusBadge(inv.paymentStatus, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft size={14} />}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
            >
              {t('common.previous')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRight size={14} />}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isFetching}
            >
              {t('common.next')}
            </Button>
          </div>
        </>
      )}

      <ParasutInvoiceDetailModal invoiceId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
