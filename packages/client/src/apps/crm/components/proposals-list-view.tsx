import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { FeatureEmptyState } from '../../../components/ui/feature-empty-state';
import { useProposals, useMyCrmPermission, canAccess, type Proposal } from '../hooks';
import { getProposalStatusVariant } from '@atlas-platform/shared';
import { formatCurrency, formatDate } from '../../../lib/format';

interface ProposalsListViewProps {
  onSelect: (id: string) => void;
  onCreateNew: (prefill?: { dealId?: string; companyId?: string; contactId?: string }) => void;
}

export function ProposalsListView({ onSelect, onCreateNew }: ProposalsListViewProps) {
  const { t } = useTranslation();
  const { data: perm } = useMyCrmPermission();
  const canCreate = canAccess(perm?.role, 'proposals', 'create');
  const { data, isLoading } = useProposals();
  const proposals = data?.proposals ?? [];
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return proposals;
    const q = search.toLowerCase();
    return proposals.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.companyName?.toLowerCase().includes(q) ||
        p.dealTitle?.toLowerCase().includes(q),
    );
  }, [proposals, search]);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} style={{ height: 40, borderRadius: 'var(--radius-sm)' }} />
        ))}
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <FeatureEmptyState
        illustration="documents"
        title={t('crm.proposals.emptyTitle')}
        description={t('crm.proposals.emptyDesc')}
        actionLabel={canCreate ? t('crm.proposals.create') : undefined}
        onAction={canCreate ? () => onCreateNew() : undefined}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-sm) var(--spacing-lg)',
          borderBottom: '1px solid var(--color-border-secondary)',
          flexShrink: 0,
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search')}
          size="sm"
          iconLeft={<Search size={14} />}
          style={{ maxWidth: 240 }}
        />
        <div style={{ flex: 1 }} />
        {canCreate && (
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => onCreateNew()}>
            {t('crm.proposals.create')}
          </Button>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <thead>
            <tr>
              {[
                t('crm.proposals.titleLabel'),
                t('crm.sidebar.companies'),
                t('crm.sidebar.deals'),
                t('crm.proposals.statusLabel'),
                t('common.totals.total'),
                t('crm.proposals.sentDate'),
              ].map((header, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: 'left',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)' as never,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontFamily: 'var(--font-family)',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderBottom: '1px solid var(--color-border-secondary)',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--color-bg-primary)',
                    zIndex: 1,
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((proposal) => (
              <tr
                key={proposal.id}
                onClick={() => onSelect(proposal.id)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <td style={tdStyle}>
                  <span
                    style={{
                      fontWeight: 'var(--font-weight-medium)' as never,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {proposal.title}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {proposal.companyName || '\u2014'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {proposal.dealTitle || '\u2014'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <Badge variant={getProposalStatusVariant(proposal.status)}>
                    {t(`crm.proposals.status.${proposal.status}`)}
                  </Badge>
                </td>
                <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(proposal.total)}
                </td>
                <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>
                  {proposal.sentAt ? formatDate(proposal.sentAt) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
  borderBottom: '1px solid var(--color-border-secondary)',
  fontSize: 'var(--font-size-sm)',
  fontFamily: 'var(--font-family)',
  color: 'var(--color-text-primary)',
};
