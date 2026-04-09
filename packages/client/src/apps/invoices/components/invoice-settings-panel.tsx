import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvoiceSettings, useUpdateInvoiceSettings } from '../hooks';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import type { UpdateInvoiceSettingsInput } from '@atlasmail/shared';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'TRY', label: 'TRY - Turkish Lira' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
];

export function InvoiceSettingsPanel() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useInvoiceSettings();
  const updateSettings = useUpdateInvoiceSettings();

  const [form, setForm] = useState<UpdateInvoiceSettingsInput>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        invoicePrefix: settings.invoicePrefix,
        defaultCurrency: settings.defaultCurrency,
        defaultTaxRate: settings.defaultTaxRate,
        eFaturaEnabled: settings.eFaturaEnabled,
        eFaturaCompanyName: settings.eFaturaCompanyName ?? '',
        eFaturaCompanyTaxId: settings.eFaturaCompanyTaxId ?? '',
        eFaturaCompanyTaxOffice: settings.eFaturaCompanyTaxOffice ?? '',
        eFaturaCompanyAddress: settings.eFaturaCompanyAddress ?? '',
        eFaturaCompanyCity: settings.eFaturaCompanyCity ?? '',
        eFaturaCompanyCountry: settings.eFaturaCompanyCountry ?? '',
        eFaturaCompanyPhone: settings.eFaturaCompanyPhone ?? '',
        eFaturaCompanyEmail: settings.eFaturaCompanyEmail ?? '',
      });
      setDirty(false);
    }
  }, [settings]);

  const update = (patch: Partial<UpdateInvoiceSettingsInput>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate(form, { onSuccess: () => setDirty(false) });
  };

  if (isLoading) return <></>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', maxWidth: 480 }}>
      <Input
        label={t('invoices.settings.invoicePrefix')}
        value={form.invoicePrefix ?? ''}
        onChange={(e) => update({ invoicePrefix: e.target.value })}
        size="sm"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
        <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
          {t('invoices.settings.defaultCurrency')}
        </label>
        <Select
          value={form.defaultCurrency ?? 'USD'}
          onChange={(val) => update({ defaultCurrency: val })}
          options={CURRENCY_OPTIONS}
          size="sm"
        />
      </div>

      <Input
        label={t('invoices.settings.defaultTaxRate')}
        type="number"
        step="0.1"
        value={String(form.defaultTaxRate ?? 0)}
        onChange={(e) => update({ defaultTaxRate: parseFloat(e.target.value) || 0 })}
        size="sm"
      />

      {/* E-Fatura toggle */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', color: 'var(--color-text-primary)' }}>
          <input
            type="checkbox"
            checked={form.eFaturaEnabled ?? false}
            onChange={(e) => update({ eFaturaEnabled: e.target.checked })}
          />
          {t('invoices.settings.eFatura')}
        </label>
      </div>

      {/* E-Fatura company details */}
      {form.eFaturaEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-family)' }}>
            {t('invoices.settings.companyDetails')}
          </span>
          <Input
            label={t('invoices.settings.companyName')}
            value={form.eFaturaCompanyName ?? ''}
            onChange={(e) => update({ eFaturaCompanyName: e.target.value })}
            size="sm"
          />
          <Input
            label={t('invoices.settings.companyTaxId')}
            value={form.eFaturaCompanyTaxId ?? ''}
            onChange={(e) => update({ eFaturaCompanyTaxId: e.target.value })}
            size="sm"
          />
          <Input
            label={t('invoices.settings.companyTaxOffice')}
            value={form.eFaturaCompanyTaxOffice ?? ''}
            onChange={(e) => update({ eFaturaCompanyTaxOffice: e.target.value })}
            size="sm"
          />
          <Input
            label={t('invoices.settings.companyAddress')}
            value={form.eFaturaCompanyAddress ?? ''}
            onChange={(e) => update({ eFaturaCompanyAddress: e.target.value })}
            size="sm"
          />
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Input
              label={t('invoices.settings.companyCity')}
              value={form.eFaturaCompanyCity ?? ''}
              onChange={(e) => update({ eFaturaCompanyCity: e.target.value })}
              size="sm"
            />
            <Input
              label={t('invoices.settings.companyCountry')}
              value={form.eFaturaCompanyCountry ?? ''}
              onChange={(e) => update({ eFaturaCompanyCountry: e.target.value })}
              size="sm"
            />
          </div>
          <Input
            label={t('invoices.settings.companyPhone')}
            value={form.eFaturaCompanyPhone ?? ''}
            onChange={(e) => update({ eFaturaCompanyPhone: e.target.value })}
            size="sm"
          />
          <Input
            label={t('invoices.settings.companyEmail')}
            value={form.eFaturaCompanyEmail ?? ''}
            onChange={(e) => update({ eFaturaCompanyEmail: e.target.value })}
            size="sm"
          />
        </div>
      )}

      {dirty && (
        <div>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
            {t('common.save')}
          </Button>
        </div>
      )}
    </div>
  );
}
