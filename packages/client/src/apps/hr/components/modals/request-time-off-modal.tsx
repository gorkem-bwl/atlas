import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/ui/modal';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { StatusDot } from '../../../../components/ui/status-dot';
import { useCreateTimeOff, useLeaveTypes, type HrEmployee } from '../../hooks';

export function RequestTimeOffModal({
  open,
  onClose,
  employees,
  forEmployeeId,
}: {
  open: boolean;
  onClose: () => void;
  employees: HrEmployee[];
  /** Pre-select employee (e.g., for "my leave" where the user is known) */
  forEmployeeId?: string;
}) {
  const { t } = useTranslation();
  const { data: leaveTypes } = useLeaveTypes();
  const [employeeId, setEmployeeId] = useState(forEmployeeId || '');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const createTimeOff = useCreateTimeOff();

  const activeTypes = (leaveTypes ?? []).filter((lt) => lt.isActive);

  const reset = () => {
    setEmployeeId(forEmployeeId || '');
    setType('');
    setStartDate('');
    setEndDate('');
    setNotes('');
  };

  const handleSubmit = () => {
    const resolvedEmployeeId = forEmployeeId || employeeId;
    if (!resolvedEmployeeId || !type || !startDate || !endDate) return;
    createTimeOff.mutate(
      { employeeId: resolvedEmployeeId, type, startDate, endDate, status: 'pending', notes: notes.trim() || null },
      { onSuccess: () => { reset(); onClose(); } },
    );
  };

  const selectedType = activeTypes.find((lt) => lt.slug === type);

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={480} title={t('hr.actions.requestTimeOff')}>
      <Modal.Header title={t('hr.actions.requestTimeOff')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Employee picker — only shown for admin view, hidden for "my leave" */}
          {!forEmployeeId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
                {t('hr.fields.employee')}
              </label>
              <Select
                value={employeeId}
                onChange={setEmployeeId}
                options={employees.filter((e) => e.status === 'active').map((e) => ({ value: e.id, label: e.name }))}
                size="sm"
              />
            </div>
          )}

          {/* Leave type — from database */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
              {t('hr.fields.leaveType', 'Leave type')}
            </label>
            {activeTypes.length > 0 ? (
              <Select
                value={type}
                onChange={setType}
                options={activeTypes.map((lt) => ({
                  value: lt.slug,
                  label: lt.name,
                  icon: <StatusDot color={lt.color} size={8} />,
                }))}
                size="sm"
              />
            ) : (
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', padding: 'var(--spacing-sm)' }}>
                {t('hr.leaveTypes.noTypes', 'No leave types configured. Go to Leave types to add them.')}
              </div>
            )}
          </div>

          {/* Date range */}
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <Input label={t('hr.fields.startDate')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} size="sm" />
            <Input label={t('hr.fields.endDate')} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} size="sm" />
          </div>

          {/* Notes */}
          <Input
            label={t('hr.fields.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('hr.fields.optionalNotes')}
            size="sm"
          />

          {/* Selected type info */}
          {selectedType && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
            }}>
              <StatusDot color={selectedType.color} size={8} />
              <span>
                {selectedType.name} — {selectedType.defaultDaysPerYear} {t('hr.leaveTypes.daysPerYear', 'days/year')}
                {selectedType.isPaid ? '' : ` (${t('hr.leaveTypes.unpaid', 'unpaid')})`}
                {selectedType.requiresApproval ? ` · ${t('hr.leaveTypes.requiresApproval', 'requires approval')}` : ''}
              </span>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!(forEmployeeId || employeeId) || !type || !startDate || !endDate || createTimeOff.isPending}
        >
          {t('hr.actions.submitRequest')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
