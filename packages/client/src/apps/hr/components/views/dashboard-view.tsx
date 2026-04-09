import { useTranslation } from 'react-i18next';
import { Users, CalendarDays, Plus, Clock, Cake } from 'lucide-react';
import { useHrDashboard } from '../../hooks';
import { Skeleton } from '../../../../components/ui/skeleton';
import { StatCard } from '../../../../components/ui/stat-card';
import { Avatar } from '../../../../components/ui/avatar';
import { formatDate } from '../../../../lib/format';
import { ExpenseDashboardSection } from '../expenses/expense-dashboard-section';

export function DashboardView() {
  const { t } = useTranslation();
  const { data, isLoading } = useHrDashboard();

  if (isLoading || !data) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)' }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
        <Skeleton style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const maxDeptCount = Math.max(...data.departmentCounts.map((d) => d.count), 1);

  return (
    <div style={{ padding: 'var(--spacing-lg)', overflow: 'auto', flex: 1 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <StatCard label={t('hr.dashboard.totalEmployees')} value={String(data.totalHeadcount)} icon={Users} color="var(--color-accent-primary)" />
        <StatCard label={t('hr.dashboard.onLeave')} value={String(data.statusCounts['on-leave'] || 0)} icon={CalendarDays} color="var(--color-warning)" />
        <StatCard label={t('hr.dashboard.pendingRequests')} value={String(data.pendingRequests)} icon={Clock} color="var(--color-error)" />
        <StatCard label={t('hr.dashboard.recentHires')} value={String(data.recentHires.length)} icon={Plus} color="var(--color-success)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
        {/* Department distribution */}
        <div style={{
          padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-primary)',
        }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-md)', fontFamily: 'var(--font-family)' }}>
            {t('hr.dashboard.byDepartment')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {data.departmentCounts.map((dept) => (
              <div key={dept.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <span style={{
                  width: 100, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {dept.name}
                </span>
                <div style={{ flex: 1, height: 8, background: 'var(--color-bg-tertiary)', borderRadius: 4 }}>
                  <div style={{
                    height: '100%', width: `${Math.max((dept.count / maxDeptCount) * 100, dept.count > 0 ? 4 : 0)}%`,
                    background: dept.color, borderRadius: 4, transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ minWidth: 24, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', textAlign: 'right' }}>
                  {dept.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tenure distribution */}
        <div style={{
          padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-primary)',
        }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-md)', fontFamily: 'var(--font-family)' }}>
            {t('hr.dashboard.tenureDistribution')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {Object.entries(data.tenure).map(([range, count]) => {
              const maxTenure = Math.max(...Object.values(data.tenure), 1);
              return (
                <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <span style={{ width: 60, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
                    {range}
                  </span>
                  <div style={{ flex: 1, height: 8, background: 'var(--color-bg-tertiary)', borderRadius: 4 }}>
                    <div style={{
                      height: '100%', width: `${Math.max((count / maxTenure) * 100, count > 0 ? 4 : 0)}%`,
                      background: 'var(--color-accent-primary)', borderRadius: 4, transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ minWidth: 24, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', textAlign: 'right' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent hires */}
        <div style={{
          padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-primary)',
        }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-md)', fontFamily: 'var(--font-family)' }}>
            {t('hr.dashboard.recentHiresTitle')}
          </h3>
          {data.recentHires.length === 0 ? (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
              {t('hr.dashboard.noRecentHires')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {data.recentHires.map((hire) => (
                <div key={hire.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <Avatar name={hire.name} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                      {hire.name}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                      {hire.role}
                    </div>
                  </div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                    {formatDate(hire.startDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming birthdays */}
        <div style={{
          padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-primary)',
        }}>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-md)', fontFamily: 'var(--font-family)' }}>
            {t('hr.dashboard.upcomingBirthdays')}
          </h3>
          {data.upcomingBirthdays.length === 0 ? (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
              {t('hr.dashboard.noBirthdays')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {data.upcomingBirthdays.map((b) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <Cake size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                  <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                    {b.name}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                    {formatDate(b.dateOfBirth)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expense overview */}
      <ExpenseDashboardSection />
    </div>
  );
}
