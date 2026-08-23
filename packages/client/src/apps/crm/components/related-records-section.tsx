import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, FolderKanban } from 'lucide-react';
import type { RelatedRecords, RelatedInvoice, RelatedProject } from '../hooks';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { formatCurrency, formatDate } from '../../../lib/format';

/**
 * Invoices and projects belonging to a CRM contact or company.
 *
 * The FKs joining CRM to Invoices and Work already existed; nothing rendered
 * them back at the customer, so seeing one customer's history meant visiting
 * three apps. See #22.
 *
 * `visibility` comes from the server and reports which sections this user may
 * see at all. A section the user cannot view is omitted entirely rather than
 * shown empty, so "no invoices" never masquerades as "no access".
 */

/** Owned by this component so it disappears together with the content. */
const separatorStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border-secondary)',
  paddingTop: 'var(--spacing-lg)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 'var(--spacing-sm)',
  fontFamily: 'var(--font-family)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--spacing-md)',
  padding: '8px var(--spacing-sm)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-primary)',
};

// Invoice statuses stored on the row: draft | sent | viewed | paid | overdue
// | waived. Note the Invoices app computes "overdue" virtually from dueDate +
// balance, so a genuinely late invoice is often stored as `sent`/`viewed`;
// isOverdue() below re-derives it so the badge matches what that app shows.
function invoiceStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'overdue':
      return 'error';
    case 'sent':
    case 'viewed':
      return 'warning';
    case 'waived':
    case 'draft':
    default:
      return 'default';
  }
}

/** An unpaid, unwaived invoice past its due date reads as overdue. */
function isOverdue(invoice: RelatedInvoice): boolean {
  if (invoice.status === 'paid' || invoice.status === 'waived' || invoice.status === 'draft') return false;
  if (!invoice.dueDate) return false;
  return new Date(invoice.dueDate).getTime() < Date.now();
}

function Row({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <div
      style={rowStyle}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={label}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      onFocus={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
      onBlur={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </div>
  );
}

function InvoiceRow({ invoice, onOpen }: { invoice: RelatedInvoice; onOpen: () => void }) {
  const { t } = useTranslation();
  const status = isOverdue(invoice) ? 'overdue' : invoice.status;
  return (
    <Row onClick={onOpen} label={`${t('crm.related.invoices')}: ${invoice.invoiceNumber}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: 0 }}>
        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{invoice.invoiceNumber}</span>
        <Badge variant={invoiceStatusVariant(status)}>
          {t(`invoices.status.${status}`, { defaultValue: status })}
        </Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexShrink: 0 }}>
        {invoice.issueDate && (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
            {formatDate(invoice.issueDate)}
          </span>
        )}
        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
          {formatCurrency(invoice.total, invoice.currency)}
        </span>
      </div>
    </Row>
  );
}

function ProjectRow({ project, onOpen }: { project: RelatedProject; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <Row onClick={onOpen} label={`${t('crm.related.projects')}: ${project.name}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: 0 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 'var(--radius-full)',
            background: project.color || 'var(--color-accent-primary)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 'var(--font-weight-medium)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {project.name}
        </span>
      </div>
      {/* The Work app translates project status under the top-level
          `projects` namespace, not under `work`. */}
      <Badge>{t(`projects.status.${project.status}`, { defaultValue: project.status })}</Badge>
    </Row>
  );
}

/** Makes the server's row cap visible instead of silently truncating. */
function ShowingCount({ shown, total }: { shown: number; total: number }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-family)',
        padding: '4px var(--spacing-sm)',
      }}
    >
      {t('crm.related.showingCount', { shown, total })}
    </div>
  );
}

export function RelatedRecordsSection({
  data,
  isLoading,
}: {
  data: RelatedRecords | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div style={{ ...separatorStyle, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <Skeleton height={16} width="40%" />
        <Skeleton height={32} />
        <Skeleton height={32} />
      </div>
    );
  }

  if (!data) return null;

  const showInvoices = data.visibility.invoices;
  const showProjects = data.visibility.projects;

  // Every section the user could see is empty — say so once rather than
  // repeating an empty state per section.
  const nothingToShow =
    (!showInvoices || data.invoices.length === 0) &&
    (!showProjects || data.projects.length === 0);

  if (!showInvoices && !showProjects) return null;

  if (nothingToShow) {
    return (
      <div style={separatorStyle}>
        <div style={labelStyle}>{t('crm.related.title')}</div>
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {t('crm.related.empty')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...separatorStyle, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {showInvoices && data.invoices.length > 0 && (
        <div>
          <div style={labelStyle}>
            <FileText size={13} />
            {t('crm.related.invoices')} ({data.totals.invoices})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.invoices.map((invoice) => (
              <InvoiceRow
                key={invoice.id}
                invoice={invoice}
                onOpen={() => navigate(`/invoices?view=invoice-detail&invoiceId=${invoice.id}`)}
              />
            ))}
            {data.totals.invoices > data.invoices.length && (
              <ShowingCount shown={data.invoices.length} total={data.totals.invoices} />
            )}
          </div>
        </div>
      )}

      {showProjects && data.projects.length > 0 && (
        <div>
          <div style={labelStyle}>
            <FolderKanban size={13} />
            {t('crm.related.projects')} ({data.totals.projects})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onOpen={() => navigate(`/work?projectId=${project.id}`)}
              />
            ))}
            {data.totals.projects > data.projects.length && (
              <ShowingCount shown={data.projects.length} total={data.totals.projects} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
