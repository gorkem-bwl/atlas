import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSettings, useUpdateProjectSettings } from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { SettingsSection, SettingsRow } from '../../../../components/settings/settings-primitives';

export function SettingsView() {
  const { t } = useTranslation();
  const { data: settings } = useProjectSettings();
  const updateSettings = useUpdateProjectSettings();

  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  useEffect(() => {
    if (settings) {
      setInvoicePrefix(settings.invoicePrefix);
      setDefaultRate(String(settings.defaultHourlyRate));
      setCompanyName(settings.companyName);
      setCompanyAddress(settings.companyAddress);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      invoicePrefix,
      defaultHourlyRate: Number(defaultRate) || 0,
      companyName,
      companyAddress,
    });
  };

  return (
    <div style={{ padding: 'var(--spacing-lg) var(--spacing-xl)', overflow: 'auto', flex: 1, maxWidth: 640 }}>
      <SettingsSection title={t('projects.settings.invoiceSettings')}>
        <SettingsRow label={t('projects.settings.invoicePrefix')} description={t('projects.settings.invoicePrefixDesc')}>
          <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} size="sm" style={{ width: 120 }} />
        </SettingsRow>
        <SettingsRow label={t('projects.settings.defaultHourlyRate')} description={t('projects.settings.defaultHourlyRateDesc')}>
          <Input type="number" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} size="sm" style={{ width: 100 }} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t('projects.settings.companyInfo')}>
        <SettingsRow label={t('projects.settings.companyName')} description={t('projects.settings.companyNameDesc')}>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} size="sm" style={{ width: 200 }} />
        </SettingsRow>
        <SettingsRow label={t('projects.settings.companyAddress')} description={t('projects.settings.companyAddressDesc')}>
          <Textarea value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} rows={2} style={{ width: 240 }} />
        </SettingsRow>
      </SettingsSection>

      <Button variant="primary" size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
        {t('projects.actions.save')}
      </Button>
    </div>
  );
}
