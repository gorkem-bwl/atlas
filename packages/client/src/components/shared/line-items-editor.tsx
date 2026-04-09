import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { IconButton } from '../ui/icon-button';
import { formatCurrency } from '../../lib/format';

// ─── Types ────────────────────────────────────────────────────────

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  readOnly?: boolean;
  currency?: string;
}

// ─── Styles ───────────────────────────────────────────────────────

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)' as never,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontFamily: 'var(--font-family)',
  padding: 'var(--spacing-sm)',
  borderBottom: '1px solid var(--color-border-secondary)',
};

const tdStyle: React.CSSProperties = {
  padding: 'var(--spacing-xs) var(--spacing-sm)',
  borderBottom: '1px solid var(--color-border-secondary)',
  fontSize: 'var(--font-size-sm)',
  fontFamily: 'var(--font-family)',
  color: 'var(--color-text-primary)',
};

const amountStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const readOnlyTextStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  fontFamily: 'var(--font-family)',
  color: 'var(--color-text-primary)',
};

// ─── Component ────────────────────────────────────────────────────

export function LineItemsEditor({
  items,
  onChange,
  readOnly = false,
  currency: _currency = 'USD',
}: LineItemsEditorProps) {
  const { t } = useTranslation();

  const handleAdd = () => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ]);
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleChange = (id: string, field: keyof LineItem, value: string | number) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  return (
    <div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '40%' }}>
              {t('common.lineItems.description')}
            </th>
            <th style={{ ...thStyle, width: '15%' }}>
              {t('common.lineItems.quantity')}
            </th>
            <th style={{ ...thStyle, width: '20%' }}>
              {t('common.lineItems.unitPrice')}
            </th>
            <th style={{ ...thStyle, width: '10%' }}>
              {t('common.lineItems.taxRate')}
            </th>
            <th style={{ ...thStyle, width: '15%', textAlign: 'right' }}>
              {t('common.lineItems.amount')}
            </th>
            {!readOnly && <th style={{ ...thStyle, width: 32 }} />}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const amount = item.quantity * item.unitPrice;

            return (
              <tr key={item.id}>
                <td style={tdStyle}>
                  {readOnly ? (
                    <span style={readOnlyTextStyle}>{item.description}</span>
                  ) : (
                    <Input
                      value={item.description}
                      onChange={(e) => handleChange(item.id, 'description', e.target.value)}
                      placeholder={t('common.lineItems.descriptionPlaceholder')}
                      size="sm"
                    />
                  )}
                </td>
                <td style={tdStyle}>
                  {readOnly ? (
                    <span style={readOnlyTextStyle}>{item.quantity}</span>
                  ) : (
                    <Input
                      type="number"
                      step="0.01"
                      value={String(item.quantity)}
                      onChange={(e) =>
                        handleChange(item.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      size="sm"
                    />
                  )}
                </td>
                <td style={tdStyle}>
                  {readOnly ? (
                    <span style={readOnlyTextStyle}>{formatCurrency(item.unitPrice)}</span>
                  ) : (
                    <Input
                      type="number"
                      step="0.01"
                      value={String(item.unitPrice)}
                      onChange={(e) =>
                        handleChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      size="sm"
                    />
                  )}
                </td>
                <td style={tdStyle}>
                  {readOnly ? (
                    <span style={readOnlyTextStyle}>{item.taxRate}%</span>
                  ) : (
                    <Input
                      type="number"
                      step="1"
                      value={String(item.taxRate)}
                      onChange={(e) =>
                        handleChange(item.id, 'taxRate', parseFloat(e.target.value) || 0)
                      }
                      size="sm"
                    />
                  )}
                </td>
                <td style={amountStyle}>
                  {formatCurrency(amount)}
                </td>
                {!readOnly && (
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <IconButton
                      icon={<Trash2 size={12} />}
                      label={t('common.delete')}
                      size={22}
                      destructive
                      onClick={() => handleRemove(item.id)}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          icon={<Plus size={13} />}
          onClick={handleAdd}
          style={{ marginTop: 'var(--spacing-sm)' }}
        >
          {t('common.lineItems.addItem')}
        </Button>
      )}
    </div>
  );
}
