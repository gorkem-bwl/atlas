import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText } from 'lucide-react';
import { getExpenseStatusVariant } from '@atlasmail/shared';
import { useMyExpenseReports, useCreateExpenseReport } from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Skeleton } from '../../../../components/ui/skeleton';
import { Input } from '../../../../components/ui/input';
import { Modal } from '../../../../components/ui/modal';
import { FeatureEmptyState } from '../../../../components/ui/feature-empty-state';
import { formatDate, formatCurrency } from '../../../../lib/format';

interface ExpenseReportsViewProps {
  onSelectReport: (reportId: string) => void;
}

export function ExpenseReportsView({ onSelectReport }: ExpenseReportsViewProps) {
  const { t } = useTranslation();
  const { data: reports, isLoading } = useMyExpenseReports();
  const createReport = useCreateExpenseReport();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');

  const handleCreate = () => {
    if (!title.trim()) return;
    createReport.mutate({ title: title.trim() }, {
      onSuccess: (report) => {
        setShowCreate(false);
        setTitle('');
        onSelectReport(report.id);
      },
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <Skeleton height={200} />
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <>
        <FeatureEmptyState
          illustration="documents"
          title={t('hr.expenses.reports.empty')}
          description={t('hr.expenses.reports.emptyDesc')}
          actionLabel={t('hr.expenses.reports.create')}
          actionIcon={<Plus size={14} />}
          onAction={() => setShowCreate(true)}
        />
        <CreateReportModal
          open={showCreate}
          onClose={() => { setShowCreate(false); setTitle(''); }}
          title={title}
          setTitle={setTitle}
          onSubmit={handleCreate}
          isPending={createReport.isPending}
          t={t}
        />
      </>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-family)',
        }}>
          {t('hr.expenses.reports.title')}
        </h2>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
          {t('hr.expenses.reports.create')}
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
        <span style={{ flex: 1, minWidth: 0 }}>{t('hr.expenses.reports.reportTitle')}</span>
        <span style={{ width: 90, flexShrink: 0 }}>{t('hr.expenses.fields.status')}</span>
        <span style={{ width: 100, flexShrink: 0, textAlign: 'right' }}>{t('hr.expenses.reports.total')}</span>
        <span style={{ width: 70, flexShrink: 0, textAlign: 'center' }}>{t('hr.expenses.reports.items')}</span>
        <span style={{ width: 100, flexShrink: 0 }}>{t('hr.expenses.reports.created')}</span>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {reports.map((report) => (
          <div
            key={report.id}
            onClick={() => onSelectReport(report.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-md) var(--spacing-lg)',
              borderBottom: '1px solid var(--color-border-secondary)',
              cursor: 'pointer',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{
              flex: 1, minWidth: 0,
              display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family)',
            }}>
              <FileText size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {report.title}
              </span>
            </span>

            <span style={{ width: 90, flexShrink: 0 }}>
              <Badge variant={getExpenseStatusVariant(report.status)}>
                {t(`hr.expenses.status.${report.status}`)}
              </Badge>
            </span>

            <span style={{
              width: 100, flexShrink: 0,
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family)',
              textAlign: 'right',
            }}>
              {formatCurrency(report.totalAmount)}
            </span>

            <span style={{
              width: 70, flexShrink: 0,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              textAlign: 'center',
            }}>
              {report.expenseCount ?? 0}
            </span>

            <span style={{
              width: 100, flexShrink: 0,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family)',
            }}>
              {formatDate(report.createdAt)}
            </span>
          </div>
        ))}
      </div>

      <CreateReportModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setTitle(''); }}
        title={title}
        setTitle={setTitle}
        onSubmit={handleCreate}
        isPending={createReport.isPending}
        t={t}
      />
    </div>
  );
}

// ─── Create Report Modal ────────────────────────────────────────

function CreateReportModal({
  open,
  onClose,
  title,
  setTitle,
  onSubmit,
  isPending,
  t,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  setTitle: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  t: (key: string) => string;
}) {
  if (!open) return null;

  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Modal.Header title={t('hr.expenses.reports.create')} />
      <Modal.Body>
        <Input
          label={t('hr.expenses.reports.reportTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('hr.expenses.reports.titlePlaceholder')}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) onSubmit(); }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={onSubmit} disabled={!title.trim() || isPending}>
          {t('common.create')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
