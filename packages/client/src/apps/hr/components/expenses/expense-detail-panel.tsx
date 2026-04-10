import { useTranslation } from 'react-i18next';
import {
  X, Edit2, Send, Trash2, RotateCcw, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { type HrExpense, type ExpenseStatus, getExpenseStatusVariant } from '@atlas-platform/shared';
import { useSubmitExpense, useRecallExpense, useDeleteExpense } from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { IconButton } from '../../../../components/ui/icon-button';
import { StatusTimeline } from '../../../../components/shared/status-timeline';
import { formatDate, formatCurrency } from '../../../../lib/format';
import { useToastStore } from '../../../../stores/toast-store';

interface ExpenseDetailPanelProps {
  expense: HrExpense;
  onClose: () => void;
  onEdit: () => void;
}

function getTimelineIndex(status: ExpenseStatus): number {
  switch (status) {
    case 'draft': return 0;
    case 'submitted': return 1;
    case 'approved': return 2;
    case 'paid': return 3;
    case 'refused': return 1; // stays at submitted level
    default: return 0;
  }
}

export function ExpenseDetailPanel({ expense, onClose, onEdit }: ExpenseDetailPanelProps) {
  const { t } = useTranslation();
  const submitExpense = useSubmitExpense();
  const recallExpense = useRecallExpense();
  const deleteExpense = useDeleteExpense();
  const addToast = useToastStore((s) => s.addToast);

  const timelineSteps = [
    { label: t('hr.expenses.status.draft'), timestamp: expense.createdAt ? formatDate(expense.createdAt) : null },
    { label: t('hr.expenses.status.submitted'), timestamp: expense.submittedAt ? formatDate(expense.submittedAt) : null },
    { label: t('hr.expenses.status.approved'), timestamp: expense.approvedAt ? formatDate(expense.approvedAt) : null },
    { label: t('hr.expenses.status.paid'), timestamp: expense.paidAt ? formatDate(expense.paidAt) : null },
  ];

  const totalAmount = (expense.amount * expense.quantity) + expense.taxAmount;

  const handleSubmit = () => {
    submitExpense.mutate(expense.id, {
      onSuccess: () => addToast({ type: 'success', message: t('hr.expenses.submitted') }),
      onError: () => addToast({ type: 'error', message: t('hr.expenses.submitFailed') }),
    });
  };

  const handleRecall = () => {
    recallExpense.mutate(expense.id, {
      onSuccess: () => addToast({ type: 'success', message: t('hr.expenses.recalled') }),
      onError: () => addToast({ type: 'error', message: t('hr.expenses.recallFailed') }),
    });
  };

  const handleDelete = () => {
    deleteExpense.mutate(expense.id, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('hr.expenses.deleted') });
        onClose();
      },
      onError: () => addToast({ type: 'error', message: t('hr.expenses.deleteFailed') }),
    });
  };

  const fieldStyle = {
    fontSize: 'var(--font-size-sm)' as const,
    color: 'var(--color-text-primary)' as const,
    fontFamily: 'var(--font-family)' as const,
  };

  const labelStyle = {
    fontSize: 'var(--font-size-xs)' as const,
    color: 'var(--color-text-tertiary)' as const,
    fontFamily: 'var(--font-family)' as const,
    fontWeight: 'var(--font-weight-medium)' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 'var(--spacing-xs)' as const,
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderLeft: '1px solid var(--color-border-primary)',
      background: 'var(--color-bg-primary)',
      width: 400,
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
          }}>
            {t('hr.expenses.expenseDetail')}
          </span>
          <Badge variant={getExpenseStatusVariant(expense.status)}>
            {t(`hr.expenses.status.${expense.status}`)}
          </Badge>
        </div>
        <IconButton icon={<X size={16} />} label={t('common.close')} size={28} onClick={onClose} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
        {/* Refused callout */}
        {expense.status === 'refused' && (
          <div style={{
            padding: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-lg)',
            background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              marginBottom: 'var(--spacing-xs)',
            }}>
              <AlertTriangle size={14} style={{ color: 'var(--color-error)' }} />
              <span style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-error)',
                fontFamily: 'var(--font-family)',
              }}>
                {t('hr.expenses.refused')}
              </span>
            </div>
            {expense.approverComment && (
              <p style={{
                margin: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)',
              }}>
                {expense.approverComment}
              </p>
            )}
          </div>
        )}

        {/* Timeline */}
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <StatusTimeline
            steps={timelineSteps}
            currentIndex={getTimelineIndex(expense.status)}
          />
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {/* Category */}
          {expense.categoryName && (
            <div>
              <div style={labelStyle}>{t('hr.expenses.fields.category')}</div>
              <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                {expense.categoryColor && (
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: expense.categoryColor, flexShrink: 0,
                  }} />
                )}
                {expense.categoryName}
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <div style={labelStyle}>{t('hr.expenses.fields.date')}</div>
            <div style={fieldStyle}>{formatDate(expense.expenseDate)}</div>
          </div>

          {/* Description */}
          <div>
            <div style={labelStyle}>{t('hr.expenses.fields.description')}</div>
            <div style={fieldStyle}>{expense.description}</div>
          </div>

          {/* Merchant */}
          {expense.merchantName && (
            <div>
              <div style={labelStyle}>{t('hr.expenses.fields.merchant')}</div>
              <div style={fieldStyle}>{expense.merchantName}</div>
            </div>
          )}

          {/* Amount breakdown */}
          <div style={{
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-secondary)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
              <span style={{ ...fieldStyle, color: 'var(--color-text-secondary)' }}>{t('hr.expenses.fields.amount')}</span>
              <span style={fieldStyle}>{formatCurrency(expense.amount)}</span>
            </div>
            {expense.quantity > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                <span style={{ ...fieldStyle, color: 'var(--color-text-secondary)' }}>{t('hr.expenses.fields.quantity')}</span>
                <span style={fieldStyle}>{expense.quantity}</span>
              </div>
            )}
            {expense.taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                <span style={{ ...fieldStyle, color: 'var(--color-text-secondary)' }}>{t('hr.expenses.fields.taxAmount')}</span>
                <span style={fieldStyle}>{formatCurrency(expense.taxAmount)}</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              borderTop: '1px solid var(--color-border-secondary)',
              paddingTop: 'var(--spacing-xs)',
              marginTop: 'var(--spacing-xs)',
            }}>
              <span style={{ ...fieldStyle, fontWeight: 'var(--font-weight-semibold)' }}>{t('hr.expenses.total')}</span>
              <span style={{ ...fieldStyle, fontWeight: 'var(--font-weight-semibold)' }}>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <div style={labelStyle}>{t('hr.expenses.fields.paymentMethod')}</div>
            <div style={fieldStyle}>{t(`hr.expenses.paymentMethods.${expense.paymentMethod}`)}</div>
          </div>

          {/* Project */}
          {expense.projectName && (
            <div>
              <div style={labelStyle}>{t('hr.expenses.fields.project')}</div>
              <div style={fieldStyle}>{expense.projectName}</div>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <div>
              <div style={labelStyle}>{t('hr.expenses.fields.notes')}</div>
              <div style={{ ...fieldStyle, color: 'var(--color-text-secondary)' }}>{expense.notes}</div>
            </div>
          )}

          {/* Receipt */}
          {expense.receiptPath && (
            <div>
              <div style={labelStyle}>{t('hr.expenses.fields.receipt')}</div>
              <a
                href={expense.receiptPath}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-accent-primary)',
                  fontFamily: 'var(--font-family)',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={12} />
                {t('hr.expenses.viewReceipt')}
              </a>
            </div>
          )}

          {/* Policy violation */}
          {expense.policyViolation && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
            }}>
              <AlertTriangle size={14} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
              <span style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-warning)',
                fontFamily: 'var(--font-family)',
              }}>
                {expense.policyViolation}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions footer */}
      {(expense.status === 'draft' || expense.status === 'submitted' || expense.status === 'refused') && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          borderTop: '1px solid var(--color-border-secondary)',
        }}>
          {expense.status === 'draft' && (
            <>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={handleDelete}
                disabled={deleteExpense.isPending}
              >
                {t('common.delete')}
              </Button>
              <div style={{ flex: 1 }} />
              <Button
                variant="secondary"
                size="sm"
                icon={<Edit2 size={14} />}
                onClick={onEdit}
              >
                {t('common.edit')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Send size={14} />}
                onClick={handleSubmit}
                disabled={submitExpense.isPending}
              >
                {t('hr.expenses.submit')}
              </Button>
            </>
          )}

          {expense.status === 'submitted' && (
            <>
              <div style={{ flex: 1 }} />
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={handleRecall}
                disabled={recallExpense.isPending}
              >
                {t('hr.expenses.recall')}
              </Button>
            </>
          )}

          {expense.status === 'refused' && (
            <>
              <div style={{ flex: 1 }} />
              <Button
                variant="secondary"
                size="sm"
                icon={<Edit2 size={14} />}
                onClick={onEdit}
              >
                {t('common.edit')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Send size={14} />}
                onClick={handleSubmit}
                disabled={submitExpense.isPending}
              >
                {t('hr.expenses.resubmit')}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
