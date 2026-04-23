import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Play, Pause, Edit2, Trash2, Send, Mail, Repeat, FileText, Calendar, Hash, Activity } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { IconButton } from '../../../components/ui/icon-button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { Tooltip } from '../../../components/ui/tooltip';
import { QueryErrorState } from '../../../components/ui/query-error-state';
import { DataTable, type DataTableColumn } from '../../../components/ui/data-table';
import { RecurringInvoiceModal } from './recurring-invoice-modal';
import {
  useRecurringInvoicesList,
  usePauseRecurringInvoice,
  useResumeRecurringInvoice,
  useRunRecurringInvoiceNow,
  useDeleteRecurringInvoice,
} from '../hooks';
import { useToastStore } from '../../../stores/toast-store';
import type { RecurringInvoice, RecurrenceFrequency } from '@atlas-platform/shared';

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function RecurringInvoicesList() {
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const { data: recurringList = [], isLoading, isError, refetch } = useRecurringInvoicesList();
  const pauseMutation = usePauseRecurringInvoice();
  const resumeMutation = useResumeRecurringInvoice();
  const runNowMutation = useRunRecurringInvoiceNow();
  const deleteMutation = useDeleteRecurringInvoice();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RecurringInvoice | null>(null);
  const [deleting, setDeleting] = useState<RecurringInvoice | null>(null);

  const handleFrequencyLabel = (freq: RecurrenceFrequency): string => {
    switch (freq) {
      case 'weekly':
        return t('invoices.recurring.frequencyWeekly');
      case 'monthly':
        return t('invoices.recurring.frequencyMonthly');
      case 'quarterly':
        return t('invoices.recurring.frequencyQuarterly');
      case 'yearly':
        return t('invoices.recurring.frequencyYearly');
      default:
        return freq;
    }
  };

  const handleTogglePause = (item: RecurringInvoice) => {
    const onError = () => addToast({ type: 'error', message: t('common.error') });
    if (item.isActive) {
      pauseMutation.mutate(item.id, {
        onSuccess: () => addToast({ type: 'success', message: t('invoices.recurring.pauseSuccess') }),
        onError,
      });
    } else {
      resumeMutation.mutate(item.id, {
        onSuccess: () => addToast({ type: 'success', message: t('invoices.recurring.resumeSuccess') }),
        onError,
      });
    }
  };

  const handleRunNow = (item: RecurringInvoice) => {
    runNowMutation.mutate(item.id, {
      onSuccess: (result) => {
        addToast({
          type: 'success',
          message: result.emailed
            ? t('invoices.recurring.runNowEmailed')
            : t('invoices.recurring.runNowSuccess'),
        });
      },
      onError: () => addToast({ type: 'error', message: t('common.error') }),
    });
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('invoices.recurring.deleteSuccess') });
        setDeleting(null);
      },
      onError: () => addToast({ type: 'error', message: t('common.error') }),
    });
  };

  const handleOpenCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: RecurringInvoice) => {
    setEditing(item);
    setShowModal(true);
  };

  const columns: DataTableColumn<RecurringInvoice>[] = useMemo(() => [
    {
      key: 'title',
      label: t('invoices.recurring.columnTitle'),
      icon: <FileText size={12} />,
      sortable: true,
      minWidth: 180,
      render: (item) => (
        <div>
          <div
            style={{
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
            }}
          >
            {item.title}
          </div>
          {item.description && (
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {item.description}
            </div>
          )}
        </div>
      ),
      searchValue: (item) => `${item.title} ${item.description ?? ''}`,
      compare: (a, b) => a.title.localeCompare(b.title),
    },
    {
      key: 'frequency',
      label: t('invoices.recurring.columnFrequency'),
      icon: <Repeat size={12} />,
      sortable: true,
      width: 120,
      render: (item) => handleFrequencyLabel(item.frequency),
      searchValue: (item) => handleFrequencyLabel(item.frequency),
    },
    {
      key: 'nextRunAt',
      label: t('invoices.recurring.columnNextRun'),
      icon: <Calendar size={12} />,
      sortable: true,
      width: 140,
      render: (item) => formatDate(item.nextRunAt),
      compare: (a, b) => {
        const aTime = a.nextRunAt ? new Date(a.nextRunAt).getTime() : 0;
        const bTime = b.nextRunAt ? new Date(b.nextRunAt).getTime() : 0;
        return aTime - bTime;
      },
    },
    {
      key: 'isActive',
      label: t('invoices.recurring.columnStatus'),
      icon: <Activity size={12} />,
      sortable: true,
      width: 100,
      render: (item) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>
          {item.isActive
            ? t('invoices.recurring.statusActive')
            : t('invoices.recurring.statusPaused')}
        </Badge>
      ),
      searchValue: (item) =>
        item.isActive
          ? t('invoices.recurring.statusActive')
          : t('invoices.recurring.statusPaused'),
      compare: (a, b) => Number(b.isActive) - Number(a.isActive),
    },
    {
      key: 'runCount',
      label: t('invoices.recurring.columnRunCount'),
      icon: <Hash size={12} />,
      sortable: true,
      width: 100,
      render: (item) => t('invoices.recurring.runCountDisplay', { count: item.runCount }),
      compare: (a, b) => a.runCount - b.runCount,
    },
    {
      key: 'autoSend',
      label: '',
      width: 40,
      hideable: false,
      render: (item) =>
        item.autoSend ? (
          <Tooltip content={t('invoices.recurring.autoSendOn')}>
            <Mail size={14} style={{ color: 'var(--color-accent-primary)' }} />
          </Tooltip>
        ) : null,
    },
    {
      key: 'actions',
      label: '',
      width: 160,
      align: 'right',
      hideable: false,
      resizable: false,
      render: (item) => (
        <div style={{ display: 'inline-flex', gap: 'var(--spacing-xs)' }}>
          <IconButton
            icon={item.isActive ? <Pause size={14} /> : <Play size={14} />}
            label={
              item.isActive
                ? t('invoices.recurring.actionPause')
                : t('invoices.recurring.actionResume')
            }
            size={28}
            onClick={(e) => { e.stopPropagation(); handleTogglePause(item); }}
          />
          <IconButton
            icon={<Send size={14} />}
            label={t('invoices.recurring.actionRunNow')}
            size={28}
            onClick={(e) => { e.stopPropagation(); handleRunNow(item); }}
          />
          <IconButton
            icon={<Edit2 size={14} />}
            label={t('invoices.recurring.actionEdit')}
            size={28}
            onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
          />
          <IconButton
            icon={<Trash2 size={14} />}
            label={t('invoices.recurring.actionDelete')}
            size={28}
            destructive
            onClick={(e) => { e.stopPropagation(); setDeleting(item); }}
          />
        </div>
      ),
    },
  ], [t]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : isLoading ? null : (
        <DataTable
          persistSortKey="invoices_recurring"
          data={recurringList}
          columns={columns}
          storageKey="recurring_invoices"
          onRowClick={(item) => handleOpenEdit(item)}
          searchable
          searchPlaceholder={t('invoices.recurring.searchPlaceholder', { defaultValue: 'Search...' })}
          resizableColumns
          paginated={false}
          emptyIcon={<Repeat size={32} style={{ color: 'var(--color-text-tertiary)' }} />}
          emptyTitle={t('invoices.recurring.emptyTitle')}
          emptyDescription={t('invoices.recurring.emptyDescription')}
          toolbar={{
            right: (
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleOpenCreate}>
                {t('invoices.recurring.createButton')}
              </Button>
            ),
          }}
        />
      )}

      <RecurringInvoiceModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditing(null);
        }}
        recurringInvoice={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t('invoices.recurring.deleteConfirmTitle')}
        description={t('invoices.recurring.deleteConfirmMessage')}
        confirmLabel={t('invoices.recurring.actionDelete')}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
