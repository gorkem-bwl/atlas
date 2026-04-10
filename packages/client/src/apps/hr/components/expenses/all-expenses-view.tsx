import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Search } from 'lucide-react';
import { type ExpenseStatus, getExpenseStatusVariant } from '@atlas-platform/shared';
import { useExpenses, useBulkPayExpenses } from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Skeleton } from '../../../../components/ui/skeleton';
import { StatusDot } from '../../../../components/ui/status-dot';
import { Input } from '../../../../components/ui/input';
import { useToastStore } from '../../../../stores/toast-store';
import { formatDate, formatCurrency } from '../../../../lib/format';

interface AllExpensesViewProps {
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const STATUS_OPTIONS: Array<{ value: ExpenseStatus | 'all'; key: string }> = [
  { value: 'all', key: 'all' },
  { value: 'draft', key: 'draft' },
  { value: 'submitted', key: 'submitted' },
  { value: 'approved', key: 'approved' },
  { value: 'refused', key: 'refused' },
  { value: 'paid', key: 'paid' },
];

export function AllExpensesView({ onSelect, selectedId }: AllExpensesViewProps) {
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const { data: expenses, isLoading } = useExpenses();
  const bulkPay = useBulkPayExpenses();

  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    if (!expenses) return [];
    let result = expenses;

    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.employeeName?.toLowerCase().includes(q) ||
          e.merchantName?.toLowerCase().includes(q) ||
          e.categoryName?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [expenses, statusFilter, searchQuery]);

  const approvedUnpaid = useMemo(
    () => filtered.filter((e) => e.status === 'approved'),
    [filtered]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === approvedUnpaid.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(approvedUnpaid.map((e) => e.id));
    }
  };

  const handleBulkPay = () => {
    if (selectedIds.length === 0) return;
    bulkPay.mutate(selectedIds, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('hr.expenses.bulkPaySuccess') });
        setSelectedIds([]);
      },
      onError: () => {
        addToast({ type: 'error', message: t('hr.expenses.bulkPayFailed') });
      },
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <Skeleton height={300} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)' }}>
      {/* Header: filters + bulk action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)',
        gap: 'var(--spacing-md)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                fontWeight: statusFilter === tab.value ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                color: statusFilter === tab.value ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                background: statusFilter === tab.value ? 'color-mix(in srgb, var(--color-accent-primary) 10%, transparent)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t(`hr.expenses.status.${tab.key}`)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <Input
            size="sm"
            placeholder={t('hr.expenses.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            iconLeft={<Search size={14} />}
            style={{ width: 220 }}
          />
          {selectedIds.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle size={14} />}
              onClick={handleBulkPay}
              disabled={bulkPay.isPending}
            >
              {t('hr.expenses.markAsPaid')} ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Table header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        padding: 'var(--spacing-sm) var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border-primary)',
        fontSize: 'var(--font-size-xs)',
        fontFamily: 'var(--font-family)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
      }}>
        {approvedUnpaid.length > 0 && (
          <span style={{ width: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <input
              type="checkbox"
              checked={selectedIds.length === approvedUnpaid.length && approvedUnpaid.length > 0}
              onChange={toggleAll}
              style={{ cursor: 'pointer' }}
            />
          </span>
        )}
        <span style={{ width: 140, flexShrink: 0 }}>{t('hr.expenses.fields.employee')}</span>
        <span style={{ width: 90, flexShrink: 0 }}>{t('hr.expenses.fields.date')}</span>
        <span style={{ width: 120, flexShrink: 0 }}>{t('hr.expenses.fields.category')}</span>
        <span style={{ flex: 1, minWidth: 0 }}>{t('hr.expenses.fields.description')}</span>
        <span style={{ width: 100, flexShrink: 0, textAlign: 'right' }}>{t('hr.expenses.fields.amount')}</span>
        <span style={{ width: 110, flexShrink: 0 }}>{t('hr.expenses.fields.project')}</span>
        <span style={{ width: 90, flexShrink: 0 }}>{t('hr.expenses.fields.status')}</span>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((expense) => {
          const isApproved = expense.status === 'approved';
          const isChecked = selectedIds.includes(expense.id);

          return (
            <div
              key={expense.id}
              onClick={() => onSelect(expense.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                borderBottom: '1px solid var(--color-border-secondary)',
                cursor: 'pointer',
                background: selectedId === expense.id ? 'var(--color-surface-selected)' : 'transparent',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (selectedId !== expense.id) e.currentTarget.style.background = 'var(--color-surface-hover)';
              }}
              onMouseLeave={(e) => {
                if (selectedId !== expense.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              {approvedUnpaid.length > 0 && (
                <span
                  style={{ width: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isApproved && (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(expense.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                </span>
              )}

              <span style={{
                width: 140, flexShrink: 0,
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {expense.employeeName || '\u2014'}
              </span>

              <span style={{
                width: 90, flexShrink: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)',
              }}>
                {formatDate(expense.expenseDate)}
              </span>

              <span style={{
                width: 120, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
              }}>
                {expense.categoryColor && <StatusDot color={expense.categoryColor} size={8} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {expense.categoryName || '\u2014'}
                </span>
              </span>

              <span style={{
                flex: 1, minWidth: 0,
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {expense.description}
              </span>

              <span style={{
                width: 100, flexShrink: 0,
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
                textAlign: 'right',
              }}>
                {formatCurrency(expense.amount)}
              </span>

              <span style={{
                width: 110, flexShrink: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {expense.projectName || '\u2014'}
              </span>

              <span style={{ width: 90, flexShrink: 0 }}>
                <Badge variant={getExpenseStatusVariant(expense.status)}>
                  {t(`hr.expenses.status.${expense.status}`)}
                </Badge>
              </span>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{
          padding: 'var(--spacing-2xl)',
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
        }}>
          {t('hr.expenses.noResults')}
        </div>
      )}
    </div>
  );
}
