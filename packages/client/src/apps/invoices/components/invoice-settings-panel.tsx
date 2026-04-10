import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvoiceSettings, useUpdateInvoiceSettings } from '../hooks';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { useToastStore } from '../../../stores/toast-store';
import type { UpdateInvoiceSettingsInput } from '@atlas-platform/shared';

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

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontFamily: 'var(--font-family)',
};

const sectionBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-lg)',
  padding: 'var(--spacing-lg)',
  background: 'var(--color-bg-secondary)',
  borderRadius: 'var(--radius-md)',
};

export function InvoiceSettingsPanel() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useInvoiceSettings();
  const updateSettings = useUpdateInvoiceSettings();
  const addToast = useToastStore((s) => s.addToast);

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
        reminderEnabled: settings.reminderEnabled ?? false,
        reminder1Days: settings.reminder1Days ?? 7,
        reminder2Days: settings.reminder2Days ?? 14,
        reminder3Days: settings.reminder3Days ?? 30,
        endlessReminderDays: settings.endlessReminderDays ?? 14,
      });
      setDirty(false);
    }
  }, [settings]);

  const update = (patch: Partial<UpdateInvoiceSettingsInput>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate(form, {
      onSuccess: () => {
        setDirty(false);
        addToast({ type: 'success', message: t('invoices.settings.saved') });
      },
      onError: () => {
        addToast({ type: 'error', message: t('common.error') });
      },
    });
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

      {/* E-Fatura section */}
      <div style={sectionBoxStyle}>
        <span style={sectionLabelStyle}>{t('invoices.settings.eFatura')}</span>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5, fontFamily: 'var(--font-family)' }}>
          {t('invoices.settings.eFaturaInfo')}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', color: 'var(--color-text-primary)' }}>
          <input
            type="checkbox"
            checked={form.eFaturaEnabled ?? false}
            onChange={(e) => update({ eFaturaEnabled: e.target.checked })}
          />
          {t('invoices.settings.eFaturaEnable')}
        </label>
      </div>

      {/* E-Fatura company details */}
      {form.eFaturaEnabled && (
        <div style={sectionBoxStyle}>
          <span style={sectionLabelStyle}>
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

      {/* Reminders section */}
      <div style={sectionBoxStyle}>
        <span style={sectionLabelStyle}>{t('invoices.settings.reminders.sectionTitle')}</span>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5, fontFamily: 'var(--font-family)' }}>
          {t('invoices.settings.reminders.sectionDescription')}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', color: 'var(--color-text-primary)' }}>
          <input
            type="checkbox"
            checked={form.reminderEnabled ?? false}
            onChange={(e) => update({ reminderEnabled: e.target.checked })}
          />
          {t('invoices.settings.reminders.enableToggle')}
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', opacity: form.reminderEnabled ? 1 : 0.5, pointerEvents: form.reminderEnabled ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-sm)' }}>
            <div style={{ flex: '0 0 140px' }}>
              <Input
                label={t('invoices.settings.reminders.reminder1Label')}
                type="number"
                min={0}
                max={365}
                value={String(form.reminder1Days ?? 7)}
                onChange={(e) => update({ reminder1Days: Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)) })}
                size="md"
              />
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)', paddingBottom: '8px' }}>
              {t('invoices.settings.reminders.daysAfterDueSuffix')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-sm)' }}>
            <div style={{ flex: '0 0 140px' }}>
              <Input
                label={t('invoices.settings.reminders.reminder2Label')}
                type="number"
                min={0}
                max={365}
                value={String(form.reminder2Days ?? 14)}
                onChange={(e) => update({ reminder2Days: Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)) })}
                size="md"
              />
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)', paddingBottom: '8px' }}>
              {t('invoices.settings.reminders.daysAfterDueSuffix')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-sm)' }}>
            <div style={{ flex: '0 0 140px' }}>
              <Input
                label={t('invoices.settings.reminders.reminder3Label')}
                type="number"
                min={0}
                max={365}
                value={String(form.reminder3Days ?? 30)}
                onChange={(e) => update({ reminder3Days: Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)) })}
                size="md"
              />
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)', paddingBottom: '8px' }}>
              {t('invoices.settings.reminders.daysAfterDueSuffix')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--spacing-sm)' }}>
              <div style={{ flex: '0 0 140px' }}>
                <Input
                  label={t('invoices.settings.reminders.endlessLabel')}
                  type="number"
                  min={0}
                  max={365}
                  value={String(form.endlessReminderDays ?? 14)}
                  onChange={(e) => update({ endlessReminderDays: Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)) })}
                  size="md"
                />
              </div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)', paddingBottom: '8px' }}>
                {t('invoices.settings.reminders.endlessSuffix')}
              </span>
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', lineHeight: 1.5, fontFamily: 'var(--font-family)' }}>
              {t('invoices.settings.reminders.endlessHelp')}
            </div>
          </div>
        </div>
      </div>

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
