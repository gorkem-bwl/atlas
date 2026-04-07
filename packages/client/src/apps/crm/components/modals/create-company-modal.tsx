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
  const createCompany = useCreateCompany();

  const reset = () => { setName(''); setDomain(''); setIndustry(''); setSize(''); setAddress(''); setPhone(''); setTaxId(''); };

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
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>{t('crm.actions.cancel')}</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>{t('crm.companies.addCompany')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
