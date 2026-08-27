import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateContact,
  type CrmCompany, type CrmContact,
} from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Modal } from '../../../../components/ui/modal';
import { AlertBanner } from '../../../../components/ui/alert-banner';

export function CreateContactModal({
  open, onClose, companies, contacts: existingContacts,
}: {
  open: boolean;
  onClose: () => void;
  companies: CrmCompany[];
  contacts: CrmContact[];
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [position, setPosition] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const createContact = useCreateContact();

  const duplicateContact = useMemo(() => {
    if (!email.trim()) return null;
    return existingContacts.find(
      (c) => c.email && c.email.toLowerCase() === email.trim().toLowerCase()
    ) ?? null;
  }, [email, existingContacts]);

  const reset = () => {
    setName(''); setEmail(''); setPhone(''); setCompanyId(''); setPosition('');
    setAddress(''); setPostalCode(''); setState(''); setCountry('');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    createContact.mutate({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      companyId: companyId || null,
      position: position.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      postalCode: postalCode.trim() || null,
      state: state.trim() || null,
      country: country.trim() || null,
    }, {
      onSuccess: () => { reset(); onClose(); },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={440} title={t('crm.contacts.newContact')}>
      <Modal.Header title={t('crm.contacts.newContact')} subtitle={t('crm.contacts.newContactSubtitle')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input label={t('crm.contacts.fullName')} value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" autoFocus />
          <div>
            <Input label={t('crm.contacts.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@company.com" />
            {duplicateContact && (
              <AlertBanner variant="warning" style={{ marginTop: 'var(--spacing-xs)' }}>
                {t('crm.contacts.duplicateEmail', { name: duplicateContact.name })}
              </AlertBanner>
            )}
          </div>
          <Input label={t('crm.contacts.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0100" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.deals.company')}</label>
            <Select
              value={companyId}
              onChange={setCompanyId}
              options={[{ value: '', label: t('crm.deals.noneAssigned') }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
              placeholder={t('crm.deals.selectCompany')}
            />
          </div>
          <Input label={t('crm.contacts.position')} value={position} onChange={(e) => setPosition(e.target.value)} placeholder="CTO" />
          <Input label={t('crm.contacts.address')} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
          <Input label={t('crm.contacts.city')} value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Francisco" />
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1 }}>
              <Input label={t('crm.contacts.postalCode')} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="94105" />
            </div>
            <div style={{ flex: 1 }}>
              <Input label={t('crm.contacts.state')} value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" />
            </div>
          </div>
          <Input label={t('crm.contacts.country')} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>{t('crm.actions.cancel')}</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>{t('crm.contacts.addContact')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
