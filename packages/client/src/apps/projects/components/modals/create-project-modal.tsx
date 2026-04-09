import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateProject } from '../../hooks';
import { useCompanies } from '../../../crm/hooks';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { Modal } from '../../../../components/ui/modal';

export function CreateProjectModal({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [budgetHours, setBudgetHours] = useState('');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const createProject = useCreateProject();
  const { data: companiesData } = useCompanies();
  const companies = companiesData?.companies ?? [];

  const reset = () => { setName(''); setCompanyId(''); setHourlyRate(''); setBudgetHours(''); setDescription(''); setIsBillable(true); };

  const handleSubmit = () => {
    if (!name.trim()) return;
    createProject.mutate({
      name: name.trim(),
      companyId: companyId || null,
      hourlyRate: Number(hourlyRate) || 0,
      budgetHours: budgetHours ? Number(budgetHours) : null,
      description: description.trim() || null,
      isBillable,
    }, {
      onSuccess: () => { reset(); onClose(); },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={480} title={t('projects.projects.newProject')}>
      <Modal.Header title={t('projects.projects.newProject')} subtitle={t('projects.projects.newProjectSubtitle')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input label={t('projects.projects.projectName')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('projects.projects.projectNamePlaceholder')} autoFocus />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
              {t('projects.projects.company')}
            </label>
            <Select
              value={companyId}
              onChange={setCompanyId}
              options={[{ value: '', label: t('projects.common.none') }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <Input label={t('projects.projects.hourlyRate')} type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="0" style={{ flex: 1 }} />
            <Input label={t('projects.projects.budgetHours')} type="number" value={budgetHours} onChange={(e) => setBudgetHours(e.target.value)} placeholder={t('projects.common.none')} style={{ flex: 1 }} />
          </div>
          <Textarea label={t('projects.projects.description')} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)', cursor: 'pointer' }}>
            <input type="checkbox" checked={isBillable} onChange={(e) => setIsBillable(e.target.checked)} />
            {t('projects.projects.billable')}
          </label>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>{t('projects.actions.cancel')}</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>{t('projects.projects.createProject')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
