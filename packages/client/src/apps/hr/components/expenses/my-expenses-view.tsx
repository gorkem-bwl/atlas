import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { type ExpenseStatus, getExpenseStatusVariant } from '@atlasmail/shared';
import { useMyExpenses } from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Skeleton } from '../../../../components/ui/skeleton';
import { FeatureEmptyState } from '../../../../components/ui/feature-empty-state';
import { StatusDot } from '../../../../components/ui/status-dot';
import { formatDate, formatCurrency } from '../../../../lib/format';

interface MyExpensesViewProps {
  onSelect: (id: string) => void;
  onAdd: () => void;
  searchQuery: string;
  selectedId: string | null;
}

const STATUS_TABS: Array<{ value: ExpenseStatus | 'all'; key: string }> = [
  { value: 'all', key: 'all' },
  { value: 'draft', key: 'draft' },
  { value: 'submitted', key: 'submitted' },
  { value: 'approved', key: 'approved' },
  { value: 'refused', key: 'refused' },
  { value: 'paid', key: 'paid' },
];

export function MyExpensesView({ onSelect, onAdd, searchQuery, selectedId }: MyExpensesViewProps) {
  const { t } = useTranslation();
  const { data: expenses, isLoading } = useMyExpenses();
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');

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
          e.merchantName?.toLowerCase().includes(q) ||
          e.categoryName?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [expenses, statusFilter, searchQuery]);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <Skeleton height={200} />
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
      <FeatureEmptyState
        illustration="documents"
        title={t('hr.expenses.empty')}
        description={t('hr.expenses.emptyDesc')}
        actionLabel={t('hr.expenses.newExpense')}
        actionIcon={<Plus size={14} />}
        onAction={onAdd}
      />
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)' }}>
      {/* Header with status filter tabs and add button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)',
      }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
          {STATUS_TABS.map((tab) => (
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
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={onAdd}>
          {t('hr.expenses.newExpense')}
        </Button>
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
        <span style={{ width: 90, flexShrink: 0 }}>{t('hr.expenses.fields.date')}</span>
        <span style={{ width: 130, flexShrink: 0 }}>{t('hr.expenses.fields.category')}</span>
        <span style={{ flex: 1, minWidth: 0 }}>{t('hr.expenses.fields.description')}</span>
        <span style={{ width: 100, flexShrink: 0, textAlign: 'right' }}>{t('hr.expenses.fields.amount')}</span>
        <span style={{ width: 120, flexShrink: 0 }}>{t('hr.expenses.fields.project')}</span>
        <span style={{ width: 90, flexShrink: 0 }}>{t('hr.expenses.fields.status')}</span>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((expense) => (
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
            <span style={{
              width: 90, flexShrink: 0,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family)',
            }}>
              {formatDate(expense.expenseDate)}
            </span>

            <span style={{
              width: 130, flexShrink: 0,
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
              width: 120, flexShrink: 0,
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
        ))}
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
