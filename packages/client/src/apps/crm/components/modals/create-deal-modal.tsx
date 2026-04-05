import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateDeal,
  type CrmDealStage, type CrmContact, type CrmCompany,
} from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Modal } from '../../../../components/ui/modal';

export function CreateDealModal({
  open, onClose, stages, contacts, companies,
}: {
  open: boolean;
  onClose: () => void;
  stages: CrmDealStage[];
  contacts: CrmContact[];
  companies: CrmCompany[];
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [probability, setProbability] = useState('');
  const [stageId, setStageId] = useState('');
  const [contactId, setContactId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const createDeal = useCreateDeal();

  const defaultStage = stages.find((s) => s.isDefault) ?? stages[0];

  useEffect(() => {
    if (open && defaultStage && !stageId) {
      setStageId(defaultStage.id);
    }
  }, [open, defaultStage, stageId]);

  const reset = () => { setTitle(''); setValue(''); setProbability(''); setStageId(''); setContactId(''); setCompanyId(''); setCloseDate(''); };

  const handleSubmit = () => {
    if (!title.trim() || !stageId) return;
    createDeal.mutate({
      title: title.trim(),
      value: Number(value) || 0,
      probability: probability !== '' ? Math.min(100, Math.max(0, Number(probability))) : undefined,
      stageId,
      contactId: contactId || null,
      companyId: companyId || null,
      expectedCloseDate: closeDate || null,
    }, {
      onSuccess: () => { reset(); onClose(); },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={480} title={t('crm.deals.newDeal')}>
      <Modal.Header title={t('crm.deals.newDeal')} subtitle={t('crm.deals.newDealSubtitle')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input label={t('crm.deals.dealTitle')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enterprise license" autoFocus />
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <Input label={t('crm.deals.valueAmount')} type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" style={{ flex: 1 }} />
            <Input label={t('crm.deals.probabilityPercent')} type="number" value={probability} onChange={(e) => setProbability(e.target.value)} placeholder="0-100" style={{ flex: 1 }} />
          </div>
          <Input label={t('crm.deals.expectedClose')} type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.deals.stage')}</label>
            <Select
              value={stageId}
              onChange={setStageId}
              options={stages.map((s) => ({ value: s.id, label: s.name }))}
              placeholder={t('crm.deals.selectStage')}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.deals.contact')}</label>
              <Select
                value={contactId}
                onChange={setContactId}
                options={[{ value: '', label: t('crm.deals.noneAssigned') }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]}
                placeholder={t('crm.deals.selectContact')}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>{t('crm.deals.company')}</label>
              <Select
                value={companyId}
                onChange={setCompanyId}
                options={[{ value: '', label: t('crm.deals.noneAssigned') }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
                placeholder={t('crm.deals.selectCompany')}
              />
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>{t('crm.actions.cancel')}</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!title.trim() || !stageId}>{t('crm.deals.createDeal')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
