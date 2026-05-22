import { useTranslation } from 'react-i18next';
import { Plug, RefreshCw } from 'lucide-react';
import type { Invoice } from '@atlas-platform/shared';
import { Button } from '../../../components/ui/button';
import { useToastStore } from '../../../stores/toast-store';
import {
  useParasutConnection,
  usePushInvoiceToParasut,
  useRefreshParasutPayment,
} from '../hooks';

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  letterSpacing: '0.05em',
  marginBottom: 'var(--spacing-sm)',
};

interface Props {
  invoice: Invoice;
}

export function InvoiceParasutSection({ invoice }: Props) {
  const { t } = useTranslation();
  const { data: connection } = useParasutConnection();
  const pushInvoice = usePushInvoiceToParasut();
  const refreshPayment = useRefreshParasutPayment();
  const addToast = useToastStore((s) => s.addToast);

  // Hide entirely unless the tenant has a connected Paraşüt account.
  if (!connection?.connected) return null;

  const synced = !!invoice.parasutInvoiceId;

  const handlePush = () => {
    pushInvoice.mutate(invoice.id, {
      onSuccess: (result) => {
        addToast({ type: 'success', message: t('invoices.parasut.syncedToParasut', { no: result.parasutNo }) });
      },
      onError: () => addToast({ type: 'error', message: t('invoices.parasut.pushFailed') }),
    });
  };

  const handleRefresh = () => {
    refreshPayment.mutate(invoice.id, {
      onSuccess: (result) => {
        if (result.markedPaid) {
          addToast({ type: 'success', message: t('invoices.parasut.testSuccess') });
        } else {
          addToast({ type: 'success', message: t('invoices.parasut.refreshPayment') });
        }
      },
      onError: () => addToast({ type: 'error', message: t('invoices.parasut.pushFailed') }),
    });
  };

  return (
    <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border-secondary)' }}>
      <div style={sectionLabelStyle}>{t('invoices.parasut.title')}</div>

      {synced ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
            {t('invoices.parasut.syncedToParasut', { no: invoice.parasutInvoiceNo ?? invoice.parasutInvoiceId })}
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={handleRefresh}
              disabled={refreshPayment.isPending}
            >
              {t('invoices.parasut.refreshPayment')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plug size={13} />}
            onClick={handlePush}
            disabled={pushInvoice.isPending}
          >
            {t('invoices.parasut.pushToParasut')}
          </Button>
        </div>
      )}
    </div>
  );
}
