import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { useCompanies, useContacts } from '../../apps/crm/hooks';
import {
  useCreateInvoice,
  useUpdateInvoice,
  useInvoiceSettings,
} from '../../apps/invoices/hooks';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Modal } from '../ui/modal';
import { LineItemsEditor, type LineItem } from './line-items-editor';
import { TotalsBlock } from './totals-block';
import { CurrencyConverter } from './currency-converter';
import type { Invoice } from '@atlas-platform/shared';

// ─── Types ────────────────────────────────────────────────────────

interface InvoiceBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (invoice: Invoice) => void;
  invoice?: Invoice | null;
  prefill?: {
    companyId?: string;
    contactId?: string;
    dealId?: string;
    proposalId?: string;
    projectId?: string;
    lineItems?: LineItem[];
    currency?: string;
    issueDate?: string;
    dueDate?: string;
    taxPercent?: number;
    notes?: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dueDateISO(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function emptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
  };
}

// ─── Component ────────────────────────────────────────────────────

export function InvoiceBuilderModal({
  open,
  onClose,
  onCreated,
  invoice,
  prefill,
}: InvoiceBuilderModalProps) {
  const { t } = useTranslation();

  // Data hooks
  const { data: companiesData } = useCompanies();
  const companies = companiesData?.companies ?? [];
  const { data: invoiceSettings } = useInvoiceSettings();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const eFaturaEnabled = invoiceSettings?.eFaturaEnabled ?? false;
  const defaultCurrency = invoiceSettings?.defaultCurrency ?? 'USD';
  const defaultTaxRate = invoiceSettings?.defaultTaxRate ?? 0;

  // Form state
  const [companyId, setCompanyId] = useState('');
  const { data: contactsData } = useContacts(companyId ? { companyId } : undefined);
  const contacts = contactsData?.contacts ?? [];
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [issueDate, setIssueDate] = useState(todayISO);
  const [dueDate, setDueDate] = useState(dueDateISO);
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [taxPercent, setTaxPercent] = useState(defaultTaxRate);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [eFaturaType, setEFaturaType] = useState('SATIS');

  // Reset / populate form when modal opens or invoice changes
  useEffect(() => {
    if (!open) return;

    if (invoice) {
      // Editing existing invoice
      setCompanyId(invoice.companyId);
      setContactId(invoice.contactId ?? '');
      setDealId(invoice.dealId ?? '');
      setProposalId(invoice.proposalId ?? '');
      setCurrency(invoice.currency);
      setIssueDate(invoice.issueDate);
      setDueDate(invoice.dueDate);
      setLineItems(
        (invoice.lineItems ?? []).map((li) => ({
          id: li.id || crypto.randomUUID(),
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxRate: li.taxRate ?? 0,
        })),
      );
      setTaxPercent(invoice.taxPercent);
      setDiscountPercent(invoice.discountPercent);
      setNotes(invoice.notes ?? '');
      setEFaturaType(invoice.eFaturaType ?? 'SATIS');
    } else {
      // New invoice — apply prefill or defaults
      setCompanyId(prefill?.companyId ?? '');
      setContactId(prefill?.contactId ?? '');
      setDealId(prefill?.dealId ?? '');
      setProposalId(prefill?.proposalId ?? '');
      setProjectId(prefill?.projectId ?? '');
      setCurrency(prefill?.currency ?? defaultCurrency);
      setIssueDate(prefill?.issueDate ?? todayISO());
      setDueDate(prefill?.dueDate ?? dueDateISO());
      setLineItems(
        prefill?.lineItems?.length
          ? prefill.lineItems.map((li) => ({ ...li, id: li.id || crypto.randomUUID() }))
          : [emptyLineItem()],
      );
      setTaxPercent(prefill?.taxPercent ?? defaultTaxRate);
      setDiscountPercent(0);
      setNotes(prefill?.notes ?? '');
      setEFaturaType('SATIS');
    }
  }, [invoice, open, prefill, defaultCurrency, defaultTaxRate]);

  // Calculations
  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0),
    [lineItems],
  );
  const taxAmount = subtotal * (taxPercent / 100);
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal + taxAmount - discountAmount;

  // Save handler
  const handleSave = (status?: string) => {
    const payload = {
      companyId,
      contactId: contactId || undefined,
      dealId: dealId || undefined,
      proposalId: proposalId || undefined,
      projectId: projectId || undefined,
      currency,
      issueDate,
      dueDate,
      lineItems: lineItems
        .filter((li) => li.description.trim())
        .map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxRate: li.taxRate,
        })),
      taxPercent,
      discountPercent,
      subtotal,
      taxAmount,
      discountAmount,
      total,
      notes: notes || undefined,
      ...(eFaturaEnabled ? { eFaturaType } : {}),
    };

    if (invoice) {
      updateInvoice.mutate(
        { id: invoice.id, ...payload, ...(status ? { status } : {}) },
        {
          onSuccess: (data) => {
            onCreated?.(data);
            onClose();
          },
        },
      );
    } else {
      createInvoice.mutate(
        { ...payload, ...(status ? { status } : {}) },
        {
          onSuccess: (data) => {
            onCreated?.(data);
            onClose();
          },
        },
      );
    }
  };

  const isSaving = createInvoice.isPending || updateInvoice.isPending;
  const canSave = !!companyId && lineItems.some((li) => li.description.trim());

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={720}
      title={invoice ? t('invoices.editInvoice') : t('invoices.newInvoice')}
    >
      <Modal.Header
        title={invoice ? t('invoices.editInvoice') : t('invoices.newInvoice')}
        subtitle={t('invoices.invoiceBuilderSubtitle')}
      />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {/* Company + dates row */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div
              style={{
                flex: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-xs)',
              }}
            >
              <label style={labelStyle}>{t('invoices.company')}</label>
              <Select
                value={companyId}
                onChange={(val) => { setCompanyId(val); setContactId(''); }}
                options={[
                  { value: '', label: t('invoices.selectCompany') },
                  ...companies.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
            <Input
              label={t('invoices.issueDate')}
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              style={{ flex: 1 }}
            />
            <Input
              label={t('invoices.dueDate')}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>

          {/* Contact */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-xs)',
              }}
            >
              <label style={labelStyle}>{t('invoices.contact')}</label>
              <Select
                value={contactId}
                onChange={setContactId}
                options={[
                  { value: '', label: t('invoices.selectContact') },
                  ...contacts.map((c) => ({
                    value: c.id,
                    label: c.email ? `${c.name} (${c.email})` : c.name,
                  })),
                ]}
                disabled={!companyId}
              />
            </div>
          </div>

          {/* Currency */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-xs)',
              }}
            >
              <label style={labelStyle}>{t('invoices.currency')}</label>
              <Select
                value={currency}
                onChange={setCurrency}
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'TRY', label: 'TRY' },
                ]}
              />
            </div>
          </div>

          {/* E-fatura type selector */}
          {eFaturaEnabled && (
            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)',
                }}
              >
                <label style={labelStyle}>{t('invoices.efatura.type')}</label>
                <Select
                  value={eFaturaType}
                  onChange={setEFaturaType}
                  options={[
                    { value: 'SATIS', label: t('invoices.efatura.typeOptions.satis') },
                    { value: 'IADE', label: t('invoices.efatura.typeOptions.iade') },
                    { value: 'TEVKIFAT', label: t('invoices.efatura.typeOptions.tevkifat') },
                    { value: 'ISTISNA', label: t('invoices.efatura.typeOptions.istisna') },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Line items editor */}
          <LineItemsEditor
            items={lineItems}
            onChange={setLineItems}
            currency={currency}
          />

          {/* Notes + totals */}
          <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
            <div style={{ flex: 1 }}>
              <Textarea
                label={t('invoices.notes')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t('invoices.notesPlaceholder')}
              />
            </div>
            <div style={{ width: 240 }}>
              <TotalsBlock
                subtotal={subtotal}
                taxPercent={taxPercent}
                discountPercent={discountPercent}
                currency={currency}
                editable
                onTaxChange={setTaxPercent}
                onDiscountChange={setDiscountPercent}
              />
              <CurrencyConverter
                amount={total}
                fromCurrency={currency}
                toCurrency={defaultCurrency}
              />
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={() => handleSave()}
          disabled={!canSave || isSaving}
        >
          {t('invoices.save')}
        </Button>
        {eFaturaEnabled && invoice && (
          <Button
            variant="secondary"
            icon={<FileText size={14} />}
            disabled={isSaving}
          >
            {t('invoices.efatura.generate')}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-family)',
};
