import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign } from 'lucide-react';
import { Modal } from '../../../components/ui/modal';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { useRecordPayment } from '../hooks';
import { useToastStore } from '../../../stores/toast-store';

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  currency: string;
  total: number;
  balanceDue: number;
}

interface ServerErrorResponse {
  response?: { data?: { error?: string } };
  message?: string;
}

function todayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getCurrencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
    }).formatToParts(0);
    const symbol = parts.find((p) => p.type === 'currency')?.value;
    return symbol ?? currency;
  } catch {
    return currency;
  }
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function RecordPaymentModal({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber: _invoiceNumber,
  currency,
  total,
  balanceDue,
}: RecordPaymentModalProps) {
  const { t } = useTranslation();
  const recordPayment = useRecordPayment();
  const addToast = useToastStore((s) => s.addToast);

  const [isRefund, setIsRefund] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(todayIso());
  const [method, setMethod] = useState<string>('bank_transfer');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (open) {
      setIsRefund(false);
      setAmount(balanceDue > 0 ? balanceDue.toFixed(2) : '');
      setPaymentDate(todayIso());
      setMethod('bank_transfer');
      setReference('');
      setNotes('');
    }
  }, [open, balanceDue]);

  const methodOptions = useMemo(
    () => [
      { value: 'cash', label: t('invoices.payments.methodCash') },
      { value: 'check', label: t('invoices.payments.methodCheck') },
      { value: 'bank_transfer', label: t('invoices.payments.methodBankTransfer') },
      { value: 'card', label: t('invoices.payments.methodCard') },
      { value: 'other', label: t('invoices.payments.methodOther') },
    ],
    [t],
  );

  const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency]);
  const parsedAmount = Number(amount);
  const amountIsValid = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  const alreadyPaid = Math.max(0, Number((total - balanceDue).toFixed(2)));
  const overPayment = !isRefund && amountIsValid && parsedAmount > balanceDue + 0.0001;
  const overRefund = isRefund && amountIsValid && parsedAmount > alreadyPaid + 0.0001;
  const dateInFuture = paymentDate > todayIso();

  const title = isRefund
    ? t('invoices.payments.recordRefund')
    : t('invoices.payments.recordPayment');
  const submitLabel = isRefund
    ? t('invoices.payments.submitRefund')
    : t('invoices.payments.submitPayment');

  const isSubmitting = recordPayment.isPending;

  const handleSubmit = () => {
    if (!amountIsValid || dateInFuture) return;

    recordPayment.mutate(
      {
        invoiceId,
        type: isRefund ? 'refund' : 'payment',
        amount: parsedAmount,
        paymentDate,
        method: method || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          const formatted = formatAmount(parsedAmount, currency);
          addToast({
            type: 'success',
            message: isRefund
              ? t('invoices.payments.refundSuccess', { amount: formatted })
              : t('invoices.payments.recordSuccess', { amount: formatted }),
          });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          const serverErr = err as ServerErrorResponse;
          const message =
            serverErr?.response?.data?.error ?? serverErr?.message ?? t('common.error');
          addToast({ type: 'error', message });
        },
      },
    );
  };

  const warningStyle: CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-warning)',
    fontFamily: 'var(--font-family)',
    fontWeight: 'var(--font-weight-normal)' as CSSProperties['fontWeight'],
  };

  const errorStyle: CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-error)',
    fontFamily: 'var(--font-family)',
    fontWeight: 'var(--font-weight-normal)' as CSSProperties['fontWeight'],
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} width={480} title={title}>
      <Modal.Header title={title} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input
            label={t('invoices.payments.amountLabel')}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            size="md"
            iconLeft={
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-family)',
                  minWidth: 16,
                  textAlign: 'center',
                }}
              >
                {currencySymbol}
              </span>
            }
          />
          {overPayment && (
            <div style={warningStyle}>{t('invoices.payments.overpayWarning')}</div>
          )}
          {overRefund && (
            <div style={warningStyle}>{t('invoices.payments.overRefundWarning')}</div>
          )}

          <Input
            label={t('invoices.payments.dateLabel')}
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            size="md"
            max={todayIso()}
          />
          {dateInFuture && (
            <div style={errorStyle}>{t('invoices.payments.dateInFutureWarning')}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              {t('invoices.payments.methodLabel')}
            </label>
            <Select value={method} onChange={setMethod} options={methodOptions} size="md" />
          </div>

          <Input
            label={t('invoices.payments.referenceLabel')}
            placeholder={t('invoices.payments.referencePlaceholder')}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            size="md"
          />

          <Textarea
            label={t('invoices.payments.notesLabel')}
            placeholder={t('invoices.payments.notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family)',
              padding: 'var(--spacing-sm)',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <input
              type="checkbox"
              checked={isRefund}
              onChange={(e) => setIsRefund(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            {t('invoices.payments.refundToggle')}
          </label>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          {t('invoices.payments.cancel')}
        </Button>
        <Button
          variant="primary"
          icon={<DollarSign size={13} />}
          onClick={handleSubmit}
          disabled={isSubmitting || !amountIsValid || dateInFuture}
        >
          {submitLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
