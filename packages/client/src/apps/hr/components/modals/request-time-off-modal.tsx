import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/ui/modal';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { useCreateTimeOff, type HrEmployee } from '../../hooks';

export function RequestTimeOffModal({
  open,
  onClose,
  employees,
}: {
  open: boolean;
  onClose: () => void;
  employees: HrEmployee[];
}) {
  const { t } = useTranslation();
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<'vacation' | 'sick' | 'personal'>('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const createTimeOff = useCreateTimeOff();

  const reset = () => {
    setEmployeeId('');
    setType('vacation');
    setStartDate('');
    setEndDate('');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!employeeId || !startDate || !endDate) return;
    createTimeOff.mutate(
      { employeeId, type, startDate, endDate, status: 'pending', notes: notes.trim() || null },
      { onSuccess: () => { reset(); onClose(); } },
    );
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={440} title={t('hr.actions.requestTimeOff')}>
      <Modal.Header title={t('hr.actions.requestTimeOff')} subtitle={t('hr.actions.requestTimeOffSubtitle')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label className="hr-field-label">{t('hr.fields.employee')}</label>
            <Select
              value={employeeId}
              onChange={setEmployeeId}
              options={employees.filter((e) => e.status === 'active').map((e) => ({ value: e.id, label: e.name }))}
              placeholder={t('hr.fields.selectEmployee')}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label className="hr-field-label">{t('hr.fields.type')}</label>
            <Select
              value={type}
              onChange={(v) => setType(v as typeof type)}
              options={[
                { value: 'vacation', label: t('hr.leaveType.vacation') },
                { value: 'sick', label: t('hr.leaveType.sick') },
                { value: 'personal', label: t('hr.leaveType.personal') },
              ]}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <Input label={t('hr.fields.startDate')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label={t('hr.fields.endDate')} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Input label={t('hr.fields.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('hr.fields.optionalNotes')} />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!employeeId || !startDate || !endDate}>
          {t('hr.actions.submitRequest')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
