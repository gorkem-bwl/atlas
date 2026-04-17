import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../../../stores/toast-store';
import { Modal } from '../../../components/ui/modal';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { LineItemsEditor, type LineItem } from '../../../components/shared/line-items-editor';
import { TotalsBlock } from '../../../components/shared/totals-block';
import { CurrencyConverter } from '../../../components/shared/currency-converter';
import {
  useCompanies,
  useContacts,
  useDeals,
  useCreateProposal,
  useUpdateProposal,
  useSendProposal,
  type Proposal,
  type CreateProposalInput,
} from '../hooks';
import { useTenantFormatSettings } from '../../../hooks/use-tenant-format-settings';

interface ProposalEditorProps {
  open: boolean;
  onClose: () => void;
  proposal?: Proposal | null;
  prefill?: {
    dealId?: string;
    companyId?: string;
    contactId?: string;
  };
}

export function ProposalEditor({ open, onClose, proposal, prefill }: ProposalEditorProps) {
  const { t } = useTranslation();
  const { addToast } = useToastStore();

  // Form state (declared first so hooks below can reference these values)
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: tenantFormats } = useTenantFormatSettings();
  const { data: companiesData } = useCompanies({});
  const companies = companiesData?.companies ?? [];
  const { data: contactsData } = useContacts(companyId ? { companyId } : {});
  const contacts = useMemo(() => contactsData?.contacts ?? [], [contactsData]);
  const { data: dealsData } = useDeals({});
  const deals = dealsData?.deals ?? [];

  // Reset contactId when company changes and selected contact no longer belongs to it
  useEffect(() => {
    if (companyId && contactId) {
      const stillValid = contacts.some((c) => c.id === contactId);
      if (!stillValid) setContactId('');
    }
  }, [companyId, contacts, contactId]);

  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const sendProposal = useSendProposal();

  const isEditing = !!proposal;

  // Initialize from proposal or prefill
  useEffect(() => {
    if (proposal) {
      setTitle(proposal.title);
      setCompanyId(proposal.companyId || '');
      setContactId(proposal.contactId || '');
      setDealId(proposal.dealId || '');
      setValidUntil(proposal.validUntil?.split('T')[0] || '');
      setNotes(proposal.notes || '');
      setLineItems(
        proposal.lineItems.map((li) => ({
          id: crypto.randomUUID(),
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxRate: li.taxRate,
        })),
      );
      setDiscountPercent(proposal.discountPercent);
    } else {
      setTitle('');
      setCompanyId(prefill?.companyId || '');
      setContactId(prefill?.contactId || '');
      setDealId(prefill?.dealId || '');
      setValidUntil('');
      setNotes('');
      setLineItems([
        { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, taxRate: 0 },
      ]);
      setDiscountPercent(0);
    }
  }, [proposal, prefill, open]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice * ((item.taxRate || 0) / 100), 0);
  const taxPercent = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal + taxAmount - discountAmount;

  const buildInput = useCallback((): CreateProposalInput => ({
    title,
    companyId: companyId || undefined,
    contactId: contactId || undefined,
    dealId: dealId || undefined,
    validUntil: validUntil || undefined,
    notes: notes || undefined,
    lineItems: lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      taxRate: li.taxRate,
    })),
    subtotal,
    taxPercent,
    taxAmount,
    discountPercent,
    discountAmount,
    total,
  }), [title, companyId, contactId, dealId, validUntil, notes, lineItems, subtotal, taxPercent, taxAmount, discountPercent, discountAmount, total]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = t('crm.proposals.titleRequired');
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      addToast({ type: 'error', message: t('crm.proposals.fillRequired') });
      return false;
    }
    return true;
  }, [title, t, addToast]);

  const handleSaveDraft = useCallback(() => {
    if (!validate()) return;
    const input = buildInput();
    if (isEditing && proposal) {
      updateProposal.mutate({ id: proposal.id, updatedAt: proposal.updatedAt, ...input }, { onSuccess: () => onClose() });
    } else {
      createProposal.mutate(input, { onSuccess: () => onClose() });
    }
  }, [validate, buildInput, isEditing, proposal, createProposal, updateProposal, onClose]);

  const handleSend = useCallback(() => {
    if (!validate()) return;
    const input = buildInput();
    if (isEditing && proposal) {
      updateProposal.mutate({ id: proposal.id, updatedAt: proposal.updatedAt, ...input }, {
        onSuccess: (saved) => {
          sendProposal.mutate(saved.id, { onSuccess: () => onClose() });
        },
      });
    } else {
      createProposal.mutate(input, {
        onSuccess: (saved) => {
          sendProposal.mutate(saved.id, { onSuccess: () => onClose() });
        },
      });
    }
  }, [validate, buildInput, isEditing, proposal, createProposal, updateProposal, sendProposal, onClose]);

  const isSaving = createProposal.isPending || updateProposal.isPending || sendProposal.isPending;

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <Modal.Header title={isEditing ? t('crm.proposals.edit') : t('crm.proposals.create')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <Input
            label={t('crm.proposals.titleLabel')}
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((prev) => ({ ...prev, title: '' })); }}
            placeholder={t('crm.proposals.titleLabel')}
            size="sm"
            error={errors.title}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={labelStyle}>{t('crm.sidebar.companies')}</span>
              <Select
                value={companyId}
                onChange={setCompanyId}
                options={[
                  { value: '', label: '\u2014' },
                  ...companies.map((c) => ({ value: c.id, label: c.name })),
                ]}
                size="sm"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={labelStyle}>{t('crm.sidebar.contacts')}</span>
              <Select
                value={contactId}
                onChange={setContactId}
                options={[
                  { value: '', label: '\u2014' },
                  ...contacts.map((c) => ({ value: c.id, label: c.name })),
                ]}
                size="sm"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={labelStyle}>{t('crm.sidebar.deals')}</span>
              <Select
                value={dealId}
                onChange={setDealId}
                options={[
                  { value: '', label: '\u2014' },
                  ...deals.map((d) => ({ value: d.id, label: d.title })),
                ]}
                size="sm"
              />
            </div>
            <Input
              label={t('crm.proposals.validUntil')}
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              size="sm"
            />
          </div>

          {/* Scope / terms */}
          <Textarea
            label={t('crm.proposals.scopeAndTerms')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('crm.proposals.scopeAndTerms')}
            rows={4}
          />

          {/* Line items */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 'var(--spacing-sm)' }}>
              {t('crm.proposals.pricing')}
            </div>
            <LineItemsEditor items={lineItems} onChange={setLineItems} />
          </div>

          {/* Totals */}
          <div style={{ maxWidth: 320, marginLeft: 'auto' }}>
            <TotalsBlock
              subtotal={subtotal}
              taxPercent={taxPercent}
              discountPercent={discountPercent}
              editable
              onDiscountChange={setDiscountPercent}
            />
            <CurrencyConverter
              amount={total}
              fromCurrency={proposal?.currency ?? tenantFormats?.defaultCurrency ?? 'USD'}
              toCurrency={tenantFormats?.defaultCurrency ?? 'USD'}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
          {t('common.cancel')}
        </Button>
        <Button variant="secondary" size="sm" onClick={handleSaveDraft} disabled={!title.trim() || isSaving}>
          {t('crm.proposals.saveDraft')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSend} disabled={!title.trim() || isSaving}>
          {t('crm.proposals.send')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--color-text-tertiary)',
  fontWeight: 'var(--font-weight-medium)' as never,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontFamily: 'var(--font-family)',
};
