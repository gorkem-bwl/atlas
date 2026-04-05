import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/ui/modal';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { useUpdateDepartment, type HrDepartment } from '../../hooks';

const DEPARTMENT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

export function EditDepartmentModal({
  open,
  onClose,
  department,
}: {
  open: boolean;
  onClose: () => void;
  department: HrDepartment;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(department.name);
  const [description, setDescription] = useState(department.description || '');
  const [color, setColor] = useState(department.color);
  const updateDepartment = useUpdateDepartment();

  useEffect(() => {
    setName(department.name);
    setDescription(department.description || '');
    setColor(department.color);
  }, [department]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    updateDepartment.mutate(
      { id: department.id, name: name.trim(), description: description.trim() || null, color },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={440} title={t('hr.actions.editDepartment')}>
      <Modal.Header title={t('hr.actions.editDepartment')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input label={t('hr.fields.departmentName')} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Input label={t('hr.fields.description')} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('hr.fields.optionalDescription')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label className="hr-field-label">{t('hr.fields.color')}</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DEPARTMENT_COLORS.map((c) => (
                <Button
                  key={c}
                  variant="ghost"
                  aria-label={`Select color ${c}`}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, minWidth: 28, padding: 0,
                    borderRadius: 'var(--radius-md)', background: c,
                    border: color === c ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                    cursor: 'pointer', transition: 'border-color 0.1s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>
          {t('common.save')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
