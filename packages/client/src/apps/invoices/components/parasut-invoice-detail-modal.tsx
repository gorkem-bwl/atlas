import { useTranslation } from 'react-i18next';
import { Badge } from '../../../components/ui/badge';
import { Modal } from '../../../components/ui/modal';
import { QueryErrorState } from '../../../components/ui/query-error-state';
import { formatCurrency, formatDate } from '../../../lib/format';
import { useParasutInvoiceDetail } from '../hooks';

interface Props {
  invoiceId: string | null;
  onClose: () => void;
}

function statusBadge(status: string | null, t: (k: string) => string): React.ReactNode {
  switch (status) {
    case 'paid':
      return <Badge variant="success">{t('invoices.parasut.statusPaid')}</Badge>;
    case 'overdue':
      return <Badge variant="error">{t('invoices.parasut.statusOverdue')}</Badge>;
    default:
      return <Badge variant="default">{t('invoices.parasut.statusUnpaid')}</Badge>;
  }
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  fontFamily: 'var(--font-family)',
};

const valueStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family)',
};

const cellStyle: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family)',
  borderBottom: '1px solid var(--color-border-secondary)',
  textAlign: 'left',
};

const headStyle: React.CSSProperties = {
  ...cellStyle,
  color: 'var(--color-text-tertiary)',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  textTransform: 'uppercase',
  fontSize: 'var(--font-size-xs)',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
};

function totalsRow(label: string, value: string, bold = false): React.ReactNode {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-xl)' }}>
      <span style={{
        fontSize: 'var(--font-size-sm)',
        color: bold ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontWeight: bold
          ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight'])
          : ('var(--font-weight-normal)' as React.CSSProperties['fontWeight']),
        fontFamily: 'var(--font-family)',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-primary)',
        fontWeight: bold
          ? ('var(--font-weight-semibold)' as React.CSSProperties['fontWeight'])
          : ('var(--font-weight-normal)' as React.CSSProperties['fontWeight']),
        fontFamily: 'var(--font-family)',
      }}>
        {value}
      </span>
    </div>
  );
}

export function ParasutInvoiceDetailModal({ invoiceId, onClose }: Props) {
  const { t } = useTranslation();
  const { data: invoice, isLoading, isError, refetch } = useParasutInvoiceDetail(invoiceId);

  const open = invoiceId !== null;
  const title = invoice?.invoiceNo
    ? `${t('invoices.parasut.detailTitle')} #${invoice.invoiceNo}`
    : t('invoices.parasut.detailTitle');
  const currency = invoice?.currency ?? undefined;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      width={680}
      title={title}
    >
      <Modal.Header title={title}>
        {invoice && statusBadge(invoice.paymentStatus, t)}
      </Modal.Header>
      <Modal.Body>
        {isError ? (
          <QueryErrorState onRetry={() => refetch()} />
        ) : isLoading || !invoice ? (
          <div style={{ padding: 24, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
            {t('common.loading')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            {/* Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>{t('invoices.parasut.customer')}</span>
                <span style={valueStyle}>{invoice.contactName ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>{t('invoices.parasut.colStatus')}</span>
                <span>{statusBadge(invoice.paymentStatus, t)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>{t('invoices.parasut.issueDate')}</span>
                <span style={valueStyle}>{formatDate(invoice.issueDate)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>{t('invoices.parasut.dueDate')}</span>
                <span style={valueStyle}>{formatDate(invoice.dueDate)}</span>
              </div>
            </div>

            {/* Line items */}
            <div style={{ border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headStyle}>{t('invoices.parasut.colDescription')}</th>
                    <th style={{ ...headStyle, textAlign: 'right' }}>{t('invoices.parasut.colQty')}</th>
                    <th style={{ ...headStyle, textAlign: 'right' }}>{t('invoices.parasut.colUnitPrice')}</th>
                    <th style={{ ...headStyle, textAlign: 'right' }}>{t('invoices.parasut.colVat')}</th>
                    <th style={{ ...headStyle, textAlign: 'right' }}>{t('invoices.parasut.colLineTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((line, i) => (
                    <tr key={i}>
                      <td style={cellStyle}>{line.description ?? '—'}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{line.quantity}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(line.unitPrice, currency)}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{`${line.vatRate}%`}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(line.lineTotal, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxWidth: 280, marginLeft: 'auto', width: '100%' }}>
              {totalsRow(t('invoices.parasut.preTax'), formatCurrency(invoice.preTaxTotal, currency))}
              {totalsRow(t('invoices.parasut.vat'), formatCurrency(invoice.totalVat, currency))}
              {totalsRow(t('invoices.parasut.total'), formatCurrency(invoice.total, currency), true)}
              {totalsRow(t('invoices.parasut.remaining'), formatCurrency(invoice.remaining, currency))}
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
