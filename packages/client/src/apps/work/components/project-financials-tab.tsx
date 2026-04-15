import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { StatCard } from '../../../components/ui/stat-card';
import { DataTable, type DataTableColumn } from '../../../components/ui/data-table';
import { FeatureEmptyState } from '../../../components/ui/feature-empty-state';
import { useProjectFinancials, type ProjectFinancialInvoice } from '../hooks';
import { getInvoiceStatusVariant } from '@atlas-platform/shared';
import type { InvoiceStatus } from '@atlas-platform/shared';

interface Project { id: string; companyId?: string | null; }
interface Props { projectId: string; project: Project; }

function fmt(n: number, currency: string) {
  if (currency === 'MIXED') return `${n.toFixed(2)} (mixed)`;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); }
  catch { return `${n.toFixed(2)} ${currency}`; }
}

export function ProjectFinancialsTab({ projectId, project }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useProjectFinancials(projectId);

  if (isLoading || !data) return <div style={{ padding: 'var(--spacing-md)' }}>{t('work.loading')}</div>;
  const { summary, invoices } = data;

  const newInvoice = () => {
    const qs = new URLSearchParams();
    qs.set('new', 'true');
    qs.set('projectId', projectId);
    if (project.companyId) qs.set('companyId', project.companyId);
    navigate(`/invoices?${qs.toString()}`);
  };

  const columns: DataTableColumn<ProjectFinancialInvoice>[] = [
    {
      key: 'invoiceNumber',
      label: t('work.financials.colNumber'),
      render: (inv) => inv.invoiceNumber,
      sortable: true,
    },
    {
      key: 'issueDate',
      label: t('work.financials.colIssueDate'),
      render: (inv) => String(inv.issueDate).slice(0, 10),
      sortable: true,
    },
    {
      key: 'dueDate',
      label: t('work.financials.colDueDate'),
      render: (inv) => String(inv.dueDate).slice(0, 10),
      sortable: true,
    },
    {
      key: 'total',
      label: t('work.financials.colTotal'),
      render: (inv) => fmt(inv.total, inv.currency),
      align: 'right',
      sortable: true,
      compare: (a, b) => a.total - b.total,
    },
    {
      key: 'balanceDue',
      label: t('work.financials.colBalance'),
      render: (inv) => fmt(inv.balanceDue, inv.currency),
      align: 'right',
      sortable: true,
      compare: (a, b) => a.balanceDue - b.balanceDue,
    },
    {
      key: 'status',
      label: t('work.financials.colStatus'),
      render: (inv) => (
        <Badge variant={getInvoiceStatusVariant(inv.status as InvoiceStatus)}>{inv.status}</Badge>
      ),
      sortable: true,
    },
  ];

  return (
    <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
        <StatCard label={t('work.financials.totalBilled')} value={fmt(summary.totalBilled, summary.currency)} />
        <StatCard label={t('work.financials.totalPaid')} value={fmt(summary.totalPaid, summary.currency)} />
        <StatCard label={t('work.financials.outstanding')} value={fmt(summary.outstanding, summary.currency)} />
      </div>

      {invoices.length === 0 ? (
        <FeatureEmptyState
          illustration="documents"
          title={t('work.financials.empty')}
          actionLabel={t('work.financials.newInvoice')}
          actionIcon={<Plus size={13} />}
          onAction={newInvoice}
        />
      ) : (
        <DataTable
          data={invoices}
          columns={columns}
          onRowClick={(inv) => navigate(`/invoices?view=invoice-detail&invoiceId=${inv.id}`)}
          toolbar={{
            right: (
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={newInvoice}>
                {t('work.financials.newInvoice')}
              </Button>
            ),
          }}
        />
      )}
    </div>
  );
}
