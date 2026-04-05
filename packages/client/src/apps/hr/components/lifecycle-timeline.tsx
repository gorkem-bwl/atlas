import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Activity, UserCheck, Star, ArrowRight, AlertCircle,
  XCircle, DollarSign, Briefcase,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  useLifecycleTimeline, useCreateLifecycleEvent,
  type HrDepartment,
} from '../hooks';
import { formatDate } from '../../../lib/format';

export function LifecycleTimeline({ employeeId, departments }: { employeeId: string; departments: HrDepartment[] }) {
  const { t } = useTranslation();
  const { data: events, isLoading } = useLifecycleTimeline(employeeId);
  const createEvent = useCreateLifecycleEvent();
  const [showAdd, setShowAdd] = useState(false);
  const [evtType, setEvtType] = useState('other');
  const [evtDate, setEvtDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [evtNotes, setEvtNotes] = useState('');

  const eventIcons: Record<string, typeof Activity> = {
    hired: UserCheck, promoted: Star, transferred: ArrowRight, resigned: AlertCircle,
    terminated: XCircle, 'salary-change': DollarSign, 'role-change': Briefcase, other: Activity,
  };

  const handleAdd = () => {
    createEvent.mutate({ employeeId, eventType: evtType, eventDate: evtDate, notes: evtNotes || undefined }, {
      onSuccess: () => { setShowAdd(false); setEvtNotes(''); },
    });
  };

  const getDeptName = (id: string | null) => departments.find(d => d.id === id)?.name || '-';

  if (isLoading) return <Skeleton height={100} />;

  return (
    <div style={{ padding: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
          {t('hr.lifecycle.title')}
        </span>
        <Button variant="ghost" size="sm" icon={<Plus size={12} />} onClick={() => setShowAdd(true)}>{t('hr.lifecycle.addEvent')}</Button>
      </div>

      {showAdd && (
        <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
            <Select value={evtType} onChange={setEvtType} options={[
              { value: 'hired', label: t('hr.lifecycle.hired') }, { value: 'promoted', label: t('hr.lifecycle.promoted') },
              { value: 'transferred', label: t('hr.lifecycle.transferred') }, { value: 'salary-change', label: t('hr.lifecycle.salaryChange') },
              { value: 'role-change', label: t('hr.lifecycle.roleChange') }, { value: 'resigned', label: t('hr.lifecycle.resigned') },
              { value: 'terminated', label: t('hr.lifecycle.terminated') }, { value: 'other', label: t('hr.lifecycle.other') },
            ]} size="sm" />
            <Input type="date" value={evtDate} onChange={(e) => setEvtDate(e.target.value)} size="sm" />
          </div>
          <Input value={evtNotes} onChange={(e) => setEvtNotes(e.target.value)} placeholder={t('hr.fields.optionalNotes')} size="sm" />
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'flex-end', marginTop: 'var(--spacing-sm)' }}>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={handleAdd}>{t('common.save')}</Button>
          </div>
        </div>
      )}

      {(!events || events.length === 0) && (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
          {t('hr.lifecycle.empty')}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events?.map((evt, i) => {
          const Icon = eventIcons[evt.eventType] || Activity;
          return (
            <div key={evt.id} style={{ display: 'flex', gap: 'var(--spacing-md)', paddingBottom: 'var(--spacing-md)', position: 'relative' }}>
              {i < (events.length - 1) && (
                <div style={{ position: 'absolute', left: 11, top: 24, bottom: 0, width: 1, background: 'var(--color-border-secondary)' }} />
              )}
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                <Icon size={12} style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                    {t(`hr.lifecycle.${evt.eventType.replace('-', '')}`, evt.eventType)}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                    {formatDate(evt.eventDate)}
                  </span>
                </div>
                {(evt.fromValue || evt.toValue) && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)', marginTop: 2 }}>
                    {evt.fromValue} {evt.fromValue && evt.toValue ? '\u2192' : ''} {evt.toValue}
                  </div>
                )}
                {(evt.fromDepartmentId || evt.toDepartmentId) && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)', marginTop: 2 }}>
                    {getDeptName(evt.fromDepartmentId)} \u2192 {getDeptName(evt.toDepartmentId)}
                  </div>
                )}
                {evt.notes && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', marginTop: 2 }}>
                    {evt.notes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
