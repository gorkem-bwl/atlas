import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../lib/format';
import { Input } from '../ui/input';

// ─── Types ────────────────────────────────────────────────────────

interface TotalsBlockProps {
  subtotal: number;
  taxPercent: number;
  discountPercent: number;
  currency?: string;
  editable?: boolean;
  onTaxChange?: (val: number) => void;
  onDiscountChange?: (val: number) => void;
}

// ─── Component ────────────────────────────────────────────────────

export function TotalsBlock({
  subtotal,
  taxPercent,
  discountPercent,
  editable = false,
  onTaxChange,
  onDiscountChange,
}: TotalsBlockProps) {
  const { t } = useTranslation();

  const taxAmount = subtotal * (taxPercent / 100);
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal + taxAmount - discountAmount;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)',
        fontFamily: 'var(--font-family)',
        fontSize: 'var(--font-size-sm)',
      }}
    >
      {/* Editable inputs — tax only when onTaxChange is provided (otherwise derived from line items) */}
      {editable && (onTaxChange || onDiscountChange) && (
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
          {onTaxChange && (
            <Input
              label={t('common.totals.taxPercent')}
              type="number"
              step="0.1"
              value={String(taxPercent)}
              onChange={(e) => onTaxChange(parseFloat(e.target.value) || 0)}
              size="sm"
            />
          )}
          {onDiscountChange && (
            <Input
              label={t('common.totals.discountPercent')}
              type="number"
              step="0.1"
              value={String(discountPercent)}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              size="sm"
            />
          )}
        </div>
      )}

      {/* Subtotal row */}
      <div style={rowStyle}>
        <span style={labelStyle}>{t('common.totals.subtotal')}</span>
        <span style={valueStyle}>{formatCurrency(subtotal)}</span>
      </div>

      {/* Tax row */}
      {taxPercent > 0 && (
        <div style={rowStyle}>
          <span style={labelStyle}>
            {t('common.totals.tax')} ({taxPercent}%)
          </span>
          <span style={valueStyle}>{formatCurrency(taxAmount)}</span>
        </div>
      )}

      {/* Discount row */}
      {discountPercent > 0 && (
        <div style={rowStyle}>
          <span style={labelStyle}>
            {t('common.totals.discount')} ({discountPercent}%)
          </span>
          <span style={valueStyle}>-{formatCurrency(discountAmount)}</span>
        </div>
      )}

      {/* Total row */}
      <div
        style={{
          ...rowStyle,
          borderTop: '1px solid var(--color-border-secondary)',
          paddingTop: 'var(--spacing-sm)',
          marginTop: 'var(--spacing-xs)',
        }}
      >
        <span
          style={{
            ...labelStyle,
            fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
          }}
        >
          {t('common.totals.total')}
        </span>
        <span style={totalStyle}>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--color-text-tertiary)',
  fontFamily: 'var(--font-family)',
  fontSize: 'var(--font-size-sm)',
};

const valueStyle: React.CSSProperties = {
  color: 'var(--color-text-primary)',
  fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right' as const,
  fontFamily: 'var(--font-family)',
  fontSize: 'var(--font-size-sm)',
};

const totalStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-lg)',
  fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
  color: 'var(--color-accent-primary)',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right' as const,
  fontFamily: 'var(--font-family)',
};
