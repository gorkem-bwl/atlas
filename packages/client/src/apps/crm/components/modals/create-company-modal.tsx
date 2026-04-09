import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateCompany } from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Modal } from '../../../../components/ui/modal';

export function CreateCompanyModal({
  open, onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [postalCode, setPostalCode] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [logo, setLogo] = useState('');
  const createCompany = useCreateCompany();

  const reset = () => { setName(''); setDomain(''); setIndustry(''); setSize(''); setAddress(''); setPhone(''); setTaxId(''); setTaxOffice(''); setCurrency('USD'); setPostalCode(''); setState(''); setCountry(''); setLogo(''); };

  const handleSubmit = () => {
    if (!name.trim()) return;
    createCompany.mutate({
      name: name.trim(),
      domain: domain.trim() || null,
      industry: industry.trim() || null,
      size: size || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      taxId: taxId.trim() || null,
      taxOffice: taxOffice.trim() || null,
      currency: currency || 'USD',
      postalCode: postalCode.trim() || null,
      state: state.trim() || null,
      country: country.trim() || null,
      logo: logo.trim() || null,
    }, {
      onSuccess: () => { reset(); onClose(); },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={440} title={t('crm.companies.newCompany')}>
      <Modal.Header title={t('crm.companies.newCompany')} subtitle={t('crm.companies.newCompanySubtitle')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input label={t('crm.companies.companyName')} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" autoFocus />
          <Input label={t('crm.companies.domain')} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <Input label={t('crm.companies.industry')} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology" style={{ flex: 1 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.companies.size')}</label>
              <Select
                value={size}
                onChange={setSize}
                options={[
                  { value: '', label: t('crm.deals.selectStage') },
                  { value: '1-10', label: '1-10' },
                  { value: '11-50', label: '11-50' },
                  { value: '51-200', label: '51-200' },
                  { value: '201-500', label: '201-500' },
                  { value: '501-1000', label: '501-1000' },
                  { value: '1000+', label: '1000+' },
                ]}
              />
            </div>
          </div>
          <Input label={t('crm.companies.address')} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
          <Input label={t('crm.contacts.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0100" />
          <Input label={t('crm.companies.taxId')} value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="1234567890" />

          {/* Billing section */}
          <div style={{ borderTop: '1px solid var(--color-border-secondary)', paddingTop: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--spacing-md)', fontFamily: 'var(--font-family)' }}>
              {t('crm.companies.billing')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <Input label={t('crm.companies.taxOffice')} value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} style={{ flex: 1 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                  <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.companies.currency')}</label>
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
              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <Input label={t('crm.companies.postalCode')} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} style={{ flex: 1 }} />
                <Input label={t('crm.companies.state')} value={state} onChange={(e) => setState(e.target.value)} style={{ flex: 1 }} />
              </div>
              <Input label={t('crm.companies.country')} value={country} onChange={(e) => setCountry(e.target.value)} />
              <Input label={t('crm.companies.logo')} value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://example.com/logo.png" />
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>{t('crm.actions.cancel')}</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>{t('crm.companies.addCompany')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
