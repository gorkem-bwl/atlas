import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react';
import { getExpenseStatusVariant } from '@atlas-platform/shared';
import { useExpenseReport, useSubmitExpenseReport } from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Skeleton } from '../../../../components/ui/skeleton';
import { StatusDot } from '../../../../components/ui/status-dot';
import { useToastStore } from '../../../../stores/toast-store';
import { formatDate, formatCurrency } from '../../../../lib/format';

interface ExpenseReportDetailProps {
  reportId: string;
  onBack: () => void;
}

const STATUS_STEPS = ['draft', 'submitted', 'approved', 'paid'] as const;

export function ExpenseReportDetail({ reportId, onBack }: ExpenseReportDetailProps) {
  const { t } = useTranslation();
  const { data: report, isLoading } = useExpenseReport(reportId);
  const submitReport = useSubmitExpenseReport();
  const addToast = useToastStore((s) => s.addToast);

  const handleSubmit = () => {
    submitReport.mutate(reportId, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('hr.expenses.reports.submitted') });
      },
      onError: () => {
        addToast({ type: 'error', message: t('hr.expenses.reports.submitFailed') });
      },
    });
  };

  if (isLoading || !report) {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <Skeleton height={300} />
      </div>
    );
  }

  const isRefused = report.status === 'refused';
  const isDraft = report.status === 'draft';
  const currentStepIndex = isRefused
    ? 1
    : STATUS_STEPS.indexOf(report.status as typeof STATUS_STEPS[number]);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)', maxWidth: 800 }}>
      {/* Back + title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-xl)',
      }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onBack}>
          {t('common.back')}
        </Button>
      </div>

      {/* Report header card */}
      <div style={{
        padding: 'var(--spacing-lg)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-primary)',
        marginBottom: 'var(--spacing-lg)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-md)',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family)',
            }}>
              {report.title}
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              marginTop: 'var(--spacing-xs)',
            }}>
              <Badge variant={getExpenseStatusVariant(report.status)}>
                {t(`hr.expenses.status.${report.status}`)}
              </Badge>
              <span style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
              }}>
                {t('hr.expenses.reports.created')}: {formatDate(report.createdAt)}
              </span>
            </div>
          </div>

          <div style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatCurrency(report.totalAmount)}
          </div>
        </div>

        {/* Refused comment */}
        {isRefused && report.approverComment && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-md)',
            background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-md)',
          }}>
            <AlertTriangle size={14} style={{ color: 'var(--color-error)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-error)',
                fontFamily: 'var(--font-family)',
                marginBottom: 2,
              }}>
                {t('hr.expenses.reports.refusedReason')}
              </div>
              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
              }}>
                {report.approverComment}
              </div>
            </div>
          </div>
        )}

        {/* Status timeline */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          marginBottom: 'var(--spacing-md)',
        }}>
          {STATUS_STEPS.map((step, idx) => {
            const isActive = idx <= currentStepIndex && !isRefused;
            const isCurrent = idx === currentStepIndex && !isRefused;
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flex: 1 }}>
                <div style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: isActive ? 'var(--color-accent-primary)' : 'var(--color-border-secondary)',
                  border: isCurrent ? '2px solid var(--color-accent-primary)' : 'none',
                  boxSizing: 'content-box',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  fontWeight: isCurrent ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                  fontFamily: 'var(--font-family)',
                }}>
                  {t(`hr.expenses.status.${step}`)}
                </span>
                {idx < STATUS_STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 1,
                    background: isActive ? 'var(--color-accent-primary)' : 'var(--color-border-secondary)',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Submit button */}
        {isDraft && (
          <Button
            variant="primary"
            size="sm"
            icon={<Send size={14} />}
            onClick={handleSubmit}
            disabled={submitReport.isPending || (report.expenses?.length ?? 0) === 0}
          >
            {t('hr.expenses.reports.submit')}
          </Button>
        )}
      </div>

      {/* Expenses list */}
      <div style={{
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-primary)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 'var(--spacing-md) var(--spacing-lg)',
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border-secondary)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-family)',
        }}>
          {t('hr.expenses.reports.expenses')} ({report.expenses?.length ?? 0})
        </div>

        {(!report.expenses || report.expenses.length === 0) ? (
          <div style={{
            padding: 'var(--spacing-2xl)',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
          }}>
            {t('hr.expenses.reports.noExpenses')}
          </div>
        ) : (
          report.expenses.map((expense, idx) => (
            <div
              key={expense.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                borderBottom: idx < report.expenses!.length - 1 ? '1px solid var(--color-border-secondary)' : 'none',
              }}
            >
              <span style={{
                width: 80, flexShrink: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)',
              }}>
                {formatDate(expense.expenseDate)}
              </span>

              <span style={{
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
                width: 110, flexShrink: 0,
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
                width: 90, flexShrink: 0,
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
                textAlign: 'right',
              }}>
                {formatCurrency(expense.amount)}
              </span>

              <span style={{ width: 80, flexShrink: 0 }}>
                <Badge variant={getExpenseStatusVariant(expense.status)}>
                  {t(`hr.expenses.status.${expense.status}`)}
                </Badge>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
