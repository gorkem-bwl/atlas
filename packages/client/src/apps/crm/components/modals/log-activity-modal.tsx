import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateActivity, useCrmPermissions,
  type CrmDeal, type CrmContact, type CrmCompany,
} from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { Modal } from '../../../../components/ui/modal';

export function LogActivityModal({
  open, onClose, defaultDealId, defaultContactId, defaultCompanyId,
  deals, contacts, companies,
}: {
  open: boolean;
  onClose: () => void;
  defaultDealId?: string | null;
  defaultContactId?: string | null;
  defaultCompanyId?: string | null;
  deals: CrmDeal[];
  contacts: CrmContact[];
  companies: CrmCompany[];
}) {
  const { t } = useTranslation();
  const [type, setType] = useState('note');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [dealId, setDealId] = useState(defaultDealId || '');
  const [contactId, setContactId] = useState(defaultContactId || '');
  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  const createActivity = useCreateActivity();
  const { data: permData } = useCrmPermissions();
  const teamMembers = permData?.permissions ?? [];

  useEffect(() => {
    setDealId(defaultDealId || '');
    setContactId(defaultContactId || '');
    setCompanyId(defaultCompanyId || '');
  }, [defaultDealId, defaultContactId, defaultCompanyId]);

  const reset = () => { setType('note'); setBody(''); setScheduledAt(''); setAssignedUserId(''); setDealId(''); setContactId(''); setCompanyId(''); };

  const handleSubmit = () => {
    if (!body.trim()) return;
    createActivity.mutate({
      type,
      body: body.trim(),
      dealId: dealId || null,
      contactId: contactId || null,
      companyId: companyId || null,
      assignedUserId: assignedUserId || null,
      scheduledAt: scheduledAt || null,
    }, {
      onSuccess: () => { reset(); onClose(); },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={480} title={t('crm.activities.logActivity')}>
      <Modal.Header title={t('crm.activities.logActivity')} subtitle={t('crm.activities.logActivitySubtitle')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.activities.type')}</label>
            <Select
              value={type}
              onChange={setType}
              options={[
                { value: 'note', label: t('crm.activities.note') },
                { value: 'call', label: t('crm.activities.call') },
                { value: 'email', label: t('crm.activities.email') },
                { value: 'meeting', label: t('crm.activities.meeting') },
              ]}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.activities.details')}</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('crm.activities.whatHappened')} rows={3} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.activities.dueDate')}</label>
              <Input type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} size="sm" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.activities.assignee')}</label>
              <Select value={assignedUserId} onChange={setAssignedUserId} options={[{ value: '', label: t('crm.activities.unassigned') }, ...teamMembers.map((m) => ({ value: m.userId, label: m.userName || m.userEmail }))]} size="sm" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.sidebar.deals')}</label>
              <Select value={dealId} onChange={setDealId} options={[{ value: '', label: t('crm.deals.noneAssigned') }, ...deals.map((d) => ({ value: d.id, label: d.title }))]} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.deals.contact')}</label>
              <Select value={contactId} onChange={setContactId} options={[{ value: '', label: t('crm.deals.noneAssigned') }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>{t('crm.actions.cancel')}</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!body.trim()}>{t('crm.activities.logActivity')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
