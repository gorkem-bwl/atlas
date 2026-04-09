import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle, XCircle, Clock, CheckSquare, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { type HrExpense } from '@atlasmail/shared';
import { usePendingExpenses, useApproveExpense, useRefuseExpense } from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Avatar } from '../../../../components/ui/avatar';
import { Skeleton } from '../../../../components/ui/skeleton';
import { Input } from '../../../../components/ui/input';
import { formatDate, formatCurrency } from '../../../../lib/format';
import { useToastStore } from '../../../../stores/toast-store';

export function ExpenseApprovalsView() {
  const { t } = useTranslation();
  const { data: pending, isLoading } = usePendingExpenses();
  const approveExpense = useApproveExpense();
  const refuseExpense = useRefuseExpense();
  const addToast = useToastStore((s) => s.addToast);

  const [refusingId, setRefusingId] = useState<string | null>(null);
  const [refuseComment, setRefuseComment] = useState('');

  const handleApprove = (id: string) => {
    approveExpense.mutate(id, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('hr.expenses.approvals.approved') });
      },
      onError: () => {
        addToast({ type: 'error', message: t('hr.expenses.approvals.approveFailed') });
      },
    });
  };

  const handleRefuse = (id: string) => {
    refuseExpense.mutate({ id, comment: refuseComment || undefined }, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('hr.expenses.approvals.refused') });
        setRefusingId(null);
        setRefuseComment('');
      },
      onError: () => {
        addToast({ type: 'error', message: t('hr.expenses.approvals.refuseFailed') });
      },
    });
  };

  const handleCancelRefuse = () => {
    setRefusingId(null);
    setRefuseComment('');
  };

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <Skeleton height={100} />
        <Skeleton height={100} />
        <Skeleton height={100} />
      </div>
    );
  }

  if (!pending || pending.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--spacing-md)',
        color: 'var(--color-text-tertiary)',
        padding: 'var(--spacing-2xl)',
      }}>
        <CheckSquare size={40} strokeWidth={1.2} />
        <span style={{ fontSize: 'var(--font-size-md)', fontFamily: 'var(--font-family)' }}>
          {t('hr.expenses.approvals.empty')}
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-xl)', maxWidth: 800 }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-xl)',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-family)',
        }}>
          {t('hr.expenses.approvals.title')}
        </h2>
        <Badge variant="warning">{pending.length}</Badge>
      </div>

      {/* Approval cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {pending.map((expense) => (
          <div
            key={expense.id}
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-lg)',
              transition: 'border-color 0.15s ease',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 'var(--spacing-lg)',
            }}>
              {/* Left: employee info + expense details */}
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', flex: 1, minWidth: 0 }}>
                <Avatar name={expense.employeeName || ''} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Employee name */}
                  <div style={{
                    fontWeight: 'var(--font-weight-medium)',
                    fontSize: 'var(--font-size-md)',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-family)',
                    marginBottom: 2,
                  }}>
                    {expense.employeeName}
                  </div>

                  {/* Category + amount + date */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    flexWrap: 'wrap',
                    marginBottom: 'var(--spacing-xs)',
                  }}>
                    {expense.categoryName && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        {expense.categoryColor && (
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: expense.categoryColor, flexShrink: 0,
                          }} />
                        )}
                        <span style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                          fontFamily: 'var(--font-family)',
                        }}>
                          {expense.categoryName}
                        </span>
                      </span>
                    )}

                    <span style={{
                      fontSize: 'var(--font-size-md)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-family)',
                    }}>
                      {formatCurrency(expense.amount)}
                    </span>

                    <span style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-tertiary)',
                      fontFamily: 'var(--font-family)',
                    }}>
                      {formatDate(expense.expenseDate)}
                    </span>
                  </div>

                  {/* Description */}
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-family)',
                    marginBottom: 'var(--spacing-xs)',
                  }}>
                    {expense.description}
                  </div>

                  {/* Merchant */}
                  {expense.merchantName && (
                    <div style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-tertiary)',
                      fontFamily: 'var(--font-family)',
                      marginBottom: 'var(--spacing-xs)',
                    }}>
                      {expense.merchantName}
                    </div>
                  )}

                  {/* Policy violation */}
                  {expense.policyViolation && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      padding: '2px var(--spacing-sm)',
                      background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 'var(--spacing-xs)',
                    }}>
                      <AlertTriangle size={12} style={{ color: 'var(--color-warning)' }} />
                      <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-warning)',
                        fontFamily: 'var(--font-family)',
                      }}>
                        {expense.policyViolation}
                      </span>
                    </div>
                  )}

                  {/* Receipt link */}
                  {expense.receiptPath && (
                    <a
                      href={expense.receiptPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-accent-primary)',
                        fontFamily: 'var(--font-family)',
                        textDecoration: 'none',
                        marginBottom: 'var(--spacing-xs)',
                      }}
                    >
                      <ExternalLink size={11} />
                      {t('hr.expenses.viewReceipt')}
                    </a>
                  )}

                  {/* Submitted time */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    marginTop: 'var(--spacing-xs)',
                  }}>
                    <Clock size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                    <span style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-tertiary)',
                      fontFamily: 'var(--font-family)',
                    }}>
                      {expense.submittedAt ? formatDate(expense.submittedAt) : formatDate(expense.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: action buttons */}
              {refusingId !== expense.id && (
                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-sm)',
                  flexShrink: 0,
                  alignItems: 'center',
                }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CheckCircle size={14} />}
                    onClick={() => handleApprove(expense.id)}
                    disabled={approveExpense.isPending}
                    style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                  >
                    {t('hr.expenses.approvals.approve')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<XCircle size={14} />}
                    onClick={() => setRefusingId(expense.id)}
                    disabled={refuseExpense.isPending}
                  >
                    {t('hr.expenses.approvals.refuse')}
                  </Button>
                </div>
              )}
            </div>

            {/* Inline refuse comment */}
            {refusingId === expense.id && (
              <div style={{
                marginTop: 'var(--spacing-md)',
                display: 'flex',
                gap: 'var(--spacing-sm)',
                alignItems: 'flex-end',
              }}>
                <div style={{ flex: 1 }}>
                  <Input
                    value={refuseComment}
                    onChange={(e) => setRefuseComment(e.target.value)}
                    placeholder={t('hr.expenses.approvals.refuseComment')}
                    size="sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRefuse(expense.id);
                      if (e.key === 'Escape') handleCancelRefuse();
                    }}
                  />
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRefuse(expense.id)}
                  disabled={refuseExpense.isPending}
                >
                  {t('hr.expenses.approvals.refuse')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelRefuse}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
