import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send, Copy, Trash2, Edit3, Link2, ArrowLeft,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { IconButton } from '../../../components/ui/icon-button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { StatusTimeline } from '../../../components/shared/status-timeline';
import { LineItemsEditor, type LineItem } from '../../../components/shared/line-items-editor';
import { TotalsBlock } from '../../../components/shared/totals-block';
import {
  useProposal,
  useSendProposal,
  useDuplicateProposal,
  useDeleteProposal,
  type Proposal,
} from '../hooks';
import { getProposalStatusVariant } from '@atlas-platform/shared';
import { formatDate } from '../../../lib/format';
import { useToastStore } from '../../../stores/toast-store';

interface ProposalDetailPanelProps {
  proposalId: string;
  onBack: () => void;
  onEdit: (proposal: Proposal) => void;
}

export function ProposalDetailPanel({ proposalId, onBack, onEdit }: ProposalDetailPanelProps) {
  const { t } = useTranslation();
  const { data: proposal, isLoading } = useProposal(proposalId);
  const sendProposal = useSendProposal();
  const duplicateProposal = useDuplicateProposal();
  const deleteProposal = useDeleteProposal();
  const { addToast } = useToastStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const publicUrl = proposal
    ? `${window.location.origin}/proposal/${proposal.publicToken}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setLinkCopied(true);
    addToast({ type: 'success', message: t('crm.proposals.linkCopied') });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const statusSteps = useMemo(() => {
    if (!proposal) return [];
    return [
      { label: t('crm.proposals.status.draft'), timestamp: formatDate(proposal.createdAt) },
      { label: t('crm.proposals.status.sent'), timestamp: proposal.sentAt ? formatDate(proposal.sentAt) : null },
      { label: t('crm.proposals.status.viewed'), timestamp: proposal.viewedAt ? formatDate(proposal.viewedAt) : null },
      {
        label: proposal.status === 'declined'
          ? t('crm.proposals.status.declined')
          : t('crm.proposals.status.accepted'),
        timestamp: proposal.acceptedAt
          ? formatDate(proposal.acceptedAt)
          : proposal.declinedAt
            ? formatDate(proposal.declinedAt)
            : null,
      },
    ];
  }, [proposal, t]);

  const currentStepIndex = useMemo(() => {
    if (!proposal) return 0;
    switch (proposal.status) {
      case 'draft': return 0;
      case 'sent': return 1;
      case 'viewed': return 2;
      case 'accepted': return 3;
      case 'declined': return 3;
      case 'expired': return 1;
      default: return 0;
    }
  }, [proposal]);

  const readOnlyLineItems: LineItem[] = useMemo(() => {
    if (!proposal) return [];
    return proposal.lineItems.map((li, i) => ({
      id: String(i),
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      taxRate: li.taxRate,
    }));
  }, [proposal]);

  if (isLoading || !proposal) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
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
        <IconButton icon={<ArrowLeft size={16} />} label={t('common.back')} size={28} onClick={onBack} />
        <span
          style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)' as never,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
            flex: 1,
          }}
        >
          {proposal.title}
        </span>
        <Badge variant={getProposalStatusVariant(proposal.status)}>
          {t(`crm.proposals.status.${proposal.status}`)}
        </Badge>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* Status timeline */}
        <StatusTimeline steps={statusSteps} currentIndex={currentStepIndex} />

        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
          {proposal.companyName && (
            <MetaField label={t('crm.sidebar.companies')} value={proposal.companyName} />
          )}
          {proposal.contactName && (
            <MetaField label={t('crm.sidebar.contacts')} value={proposal.contactName} />
          )}
          {proposal.dealTitle && (
            <MetaField label={t('crm.sidebar.deals')} value={proposal.dealTitle} />
          )}
          {proposal.validUntil && (
            <MetaField label={t('crm.proposals.validUntil')} value={formatDate(proposal.validUntil)} />
          )}
        </div>

        {/* Scope / terms */}
        {proposal.notes && (
          <div>
            <div style={sectionLabelStyle}>{t('crm.proposals.scopeAndTerms')}</div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                color: 'var(--color-text-primary)',
                whiteSpace: 'pre-wrap',
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {proposal.notes}
            </div>
          </div>
        )}

        {/* Line items */}
        <div>
          <div style={sectionLabelStyle}>{t('crm.proposals.pricing')}</div>
          <LineItemsEditor items={readOnlyLineItems} onChange={() => {}} readOnly />
        </div>

        {/* Totals */}
        <div style={{ maxWidth: 320, marginLeft: 'auto' }}>
          <TotalsBlock
            subtotal={proposal.subtotal}
            taxPercent={proposal.taxPercent}
            discountPercent={proposal.discountPercent}
          />
        </div>

        {/* Public link */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Link2 size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              color: 'var(--color-text-secondary)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {publicUrl}
          </span>
          <Button variant="ghost" size="sm" onClick={handleCopyLink}>
            {linkCopied ? t('crm.proposals.linkCopied') : t('crm.proposals.copyLink')}
          </Button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" icon={<Edit3 size={14} />} onClick={() => onEdit(proposal)}>
            {t('crm.proposals.edit')}
          </Button>
          {proposal.status === 'draft' && (
            <Button variant="primary" size="sm" icon={<Send size={14} />} onClick={() => sendProposal.mutate(proposal.id)} disabled={sendProposal.isPending}>
              {t('crm.proposals.send')}
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={<Copy size={14} />} onClick={() => duplicateProposal.mutate(proposal.id)} disabled={duplicateProposal.isPending}>
            {t('crm.proposals.duplicate')}
          </Button>
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setShowDeleteConfirm(true)}>
            {t('crm.proposals.delete')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('crm.proposals.delete')}
        description={t('crm.proposals.deleteConfirm', { title: proposal.title })}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={() => {
          deleteProposal.mutate(proposal.id, { onSuccess: () => onBack() });
        }}
      />
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={sectionLabelStyle}>{label}</span>
      <span
        style={{
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          color: 'var(--color-text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)' as never,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontFamily: 'var(--font-family)',
  marginBottom: 'var(--spacing-xs)',
};
