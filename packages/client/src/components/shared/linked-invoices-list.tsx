import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, ExternalLink } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import type { Invoice } from '@atlas/shared';
import { getInvoiceStatusVariant } from '@atlas/shared';
import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/format';

interface LinkedInvoicesListProps {
  invoices: Invoice[];
  isLoading?: boolean;
  limit?: number;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
}

export function LinkedInvoicesList({
  invoices,
  isLoading = false,
  limit = 5,
  showCreateButton = true,
  onCreateClick,
}: LinkedInvoicesListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const displayed = invoices.slice(0, limit);
  const hasMore = invoices.length > limit;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ height: 32, borderRadius: 'var(--radius-sm)' }} />
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family)',
            padding: 'var(--spacing-md) 0',
            textAlign: 'center',
          }}
        >
          {t('projects.clients.noInvoices')}
        </span>
        {showCreateButton && onCreateClick && (
          <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={onCreateClick}>
            {t('projects.invoices.newInvoice')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {displayed.map((invoice) => (
        <div
          key={invoice.id}
          onClick={() => navigate(`/invoices?id=${invoice.id}`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-sm) var(--spacing-xs)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--font-size-sm)',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span
            style={{
              fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-text-primary)',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {invoice.invoiceNumber}
          </span>
          <span
            style={{
              color: 'var(--color-text-secondary)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatCurrency(invoice.total)}
          </span>
          <Badge variant={getInvoiceStatusVariant(invoice.status)}>
            {invoice.status}
          </Badge>
          <span
            style={{
              marginLeft: 'auto',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-xs)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatDate(invoice.issueDate)}
          </span>
        </div>
      ))}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          marginTop: 'var(--spacing-xs)',
        }}
      >
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            icon={<ExternalLink size={14} />}
            onClick={() => navigate('/invoices')}
          >
            {t('projects.clients.linkedInvoices')} ({invoices.length})
          </Button>
        )}
        {showCreateButton && onCreateClick && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus size={14} />}
            onClick={onCreateClick}
            style={{ marginLeft: hasMore ? 0 : undefined }}
          >
            {t('projects.invoices.newInvoice')}
          </Button>
        )}
      </div>
    </div>
  );
}
