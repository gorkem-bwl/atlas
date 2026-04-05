import { useTranslation } from 'react-i18next';
import { Building2, Trash2, Edit3 } from 'lucide-react';
import { type HrDepartment, type HrEmployee } from '../../hooks';
import { useMyAppPermission } from '../../../../hooks/use-app-permissions';
import { IconButton } from '../../../../components/ui/icon-button';
import { Avatar } from '../../../../components/ui/avatar';

export function DepartmentsView({
  departments,
  employees,
  onEdit,
  onDelete,
}: {
  departments: HrDepartment[];
  employees: HrEmployee[];
  onEdit: (dept: HrDepartment) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { data: hrPerm } = useMyAppPermission('hr');
  const canDelete = !hrPerm || hrPerm.role === 'admin';
  if (departments.length === 0) {
    return (
      <div className="hr-empty-state">
        <Building2 size={48} className="hr-empty-state-icon" />
        <div className="hr-empty-state-title">{t('hr.departments.empty')}</div>
        <div className="hr-empty-state-desc">{t('hr.departments.emptyDesc')}</div>
      </div>
    );
  }

  return (
    <div className="hr-dept-grid">
      {departments.map((dept) => {
        const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
        const headEmployee = dept.headEmployeeId ? employees.find((e) => e.id === dept.headEmployeeId) : null;

        return (
          <div key={dept.id} className="hr-dept-card">
            <div style={{ height: 4, background: dept.color }} />
            <div style={{ padding: 'var(--spacing-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                <div>
                  <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)', marginBottom: 4 }}>
                    {dept.name}
                  </div>
                  {dept.description && (
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                      {dept.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <IconButton icon={<Edit3 size={14} />} label={t('hr.actions.editDepartment')} size={28} onClick={() => onEdit(dept)} />
                  {canDelete && <IconButton icon={<Trash2 size={14} />} label={t('hr.actions.deleteDepartment')} size={28} destructive onClick={() => onDelete(dept.id)} />}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border-secondary)' }}>
                {headEmployee ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
                    <Avatar name={headEmployee.name} size={20} />
                    {headEmployee.name}
                  </div>
                ) : (
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                    {t('hr.departments.noHead')}
                  </span>
                )}
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', fontVariantNumeric: 'tabular-nums' }}>
                  {deptEmployees.length} {deptEmployees.length === 1 ? t('hr.departments.member') : t('hr.departments.members')}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
