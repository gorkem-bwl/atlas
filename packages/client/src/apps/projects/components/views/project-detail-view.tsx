import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Clock, DollarSign, TrendingUp, AlertCircle,
  Users, Calendar,
} from 'lucide-react';
import { useProject, useTimeEntries, useProjectMembers, useProjectSettings } from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { StatusDot } from '../../../../components/ui/status-dot';
import { Skeleton } from '../../../../components/ui/skeleton';
import { formatCurrency, formatNumber, formatDate } from '../../../../lib/format';

// ─── Helpers ─────────────────────────────────────────────────────

function formatHoursMinutes(totalHours: number): string {
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  if (h === 0 && m === 0) return '0h';
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Stat Card ───────────────────────────────────────────────────

function StatCard({ icon, label, value, subValue, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  return (
    <div style={{
      flex: 1,
      minWidth: 160,
      padding: 'var(--spacing-lg)',
      background: 'var(--color-bg-primary)',
      border: '1px solid var(--color-border-secondary)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-md)',
          background: color + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-family)',
          fontWeight: 'var(--font-weight-medium)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: 'var(--font-size-2xl)',
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      {subValue && (
        <span style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-family)',
        }}>
          {subValue}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetailView({ projectId, onBack }: ProjectDetailViewProps) {
  const { t } = useTranslation();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: timeData, isLoading: timeLoading } = useTimeEntries({ projectId });
  const { data: members } = useProjectMembers(projectId);
  const { data: settings } = useProjectSettings();

  const entries = timeData?.entries ?? [];

  // Compute stats
  const stats = useMemo(() => {
    if (!project) return null;

    const totalHours = project.totalHours;
    const defaultRate = settings?.defaultHourlyRate ?? 0;
    // Use default rate since hourlyRate is per-member in this model
    const earnings = totalHours * defaultRate;
    const estimatedAmount = project.budgetAmount ?? 0;
    const balance = estimatedAmount - earnings;
    const unbilledHours = project.unbilledHours;

    return { totalHours, earnings, balance, unbilledHours };
  }, [project, settings]);

  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [entries]);

  if (projectLoading || timeLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Skeleton width="200px" height="28px" />
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} width="100%" height="100px" />)}
        </div>
        <Skeleton width="100%" height="300px" />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onBack}>
          {t('projects.detail.backToProjects')}
        </Button>
        <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
          {t('projects.detail.notFound')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: 'var(--spacing-lg) var(--spacing-xl)',
        borderBottom: '1px solid var(--color-border-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        flexShrink: 0,
      }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onBack}>
          {t('projects.detail.backToProjects')}
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1 }}>
          <StatusDot color={project.color} size={10} />
          <span style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
          }}>
            {project.name}
          </span>
          <Badge variant={project.status === 'active' ? 'success' : project.status === 'paused' ? 'warning' : project.status === 'completed' ? 'primary' : 'default'}>
            {t(`projects.status.${project.status}`)}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
        {/* Stat cards */}
        {stats && (
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <StatCard
              icon={<Clock size={14} />}
              label={t('projects.detail.duration')}
              value={formatHoursMinutes(stats.totalHours)}
              subValue={project.budgetHours ? `/ ${formatNumber(project.budgetHours, 0)}h ${t('projects.detail.budgeted')}` : undefined}
              color="#0ea5e9"
            />
            <StatCard
              icon={<DollarSign size={14} />}
              label={t('projects.detail.earnings')}
              value={formatCurrency(stats.earnings)}
              color="#10b981"
            />
            <StatCard
              icon={<TrendingUp size={14} />}
              label={t('projects.detail.balance')}
              value={formatCurrency(stats.balance)}
              subValue={project.budgetAmount ? `${t('projects.detail.of')} ${formatCurrency(project.budgetAmount)}` : undefined}
              color={stats.balance >= 0 ? '#0ea5e9' : '#ef4444'}
            />
            <StatCard
              icon={<AlertCircle size={14} />}
              label={t('projects.detail.unbilled')}
              value={formatHoursMinutes(stats.unbilledHours)}
              color="#f59e0b"
            />
          </div>
        )}

        {/* Two-column layout */}
        <div style={{ display: 'flex', gap: 'var(--spacing-xl)', flex: 1, minHeight: 0 }}>
          {/* Left column: project info + recent entries */}
          <div style={{ flex: 6, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', minWidth: 0 }}>
            {/* Project info */}
            <div style={{
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)',
            }}>
              <span style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
              }}>
                {t('projects.detail.projectInfo')}
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                {project.companyName && (
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', marginBottom: 2 }}>
                      {t('projects.projects.company')}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                      <Users size={13} style={{ color: 'var(--color-text-tertiary)' }} />
                      {project.companyName}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', marginBottom: 2 }}>
                    {t('projects.projects.billable')}
                  </div>
                  <Badge variant={project.isBillable ? 'success' : 'default'}>
                    {project.isBillable ? t('projects.common.yes') : t('projects.common.no')}
                  </Badge>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', marginBottom: 2 }}>
                    {t('projects.detail.created')}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <Calendar size={13} style={{ color: 'var(--color-text-tertiary)' }} />
                    {formatDate(project.createdAt)}
                  </div>
                </div>
              </div>

              {project.description && (
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', marginBottom: 2 }}>
                    {t('projects.projects.description')}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)', lineHeight: 'var(--line-height-normal)' }}>
                    {project.description}
                  </div>
                </div>
              )}
            </div>

            {/* Recent time entries */}
            <div style={{
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)',
            }}>
              <span style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
              }}>
                {t('projects.dashboard.recentTimeEntries')}
              </span>

              {recentEntries.length === 0 ? (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', padding: 'var(--spacing-lg) 0', textAlign: 'center' }}>
                  {t('projects.reports.noData')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentEntries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--spacing-sm) 0',
                        borderBottom: '1px solid var(--color-border-secondary)',
                        gap: 'var(--spacing-md)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-primary)',
                          fontFamily: 'var(--font-family)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {entry.description || t('projects.dashboard.noDescription')}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', marginTop: 1 }}>
                          {formatDate(entry.date)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexShrink: 0 }}>
                        {entry.isBillable && (
                          <Badge variant="success">
                            {t('projects.projects.billable')}
                          </Badge>
                        )}
                        <span style={{
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-text-primary)',
                          fontFamily: 'var(--font-family)',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {formatHoursMinutes(entry.hours)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: team members */}
          <div style={{ flex: 4, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', minWidth: 0 }}>
            <div style={{
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)',
            }}>
              <span style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
              }}>
                {t('projects.detail.teamMembers')}
              </span>

              {!members || members.length === 0 ? (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', padding: 'var(--spacing-lg) 0', textAlign: 'center' }}>
                  {t('projects.detail.noMembers')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {members.map((member) => (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--spacing-sm) 0',
                        borderBottom: '1px solid var(--color-border-secondary)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: 0 }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'var(--color-bg-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-text-secondary)',
                          fontFamily: 'var(--font-family)',
                          flexShrink: 0,
                        }}>
                          {(member.userName ?? member.userEmail ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-primary)',
                            fontFamily: 'var(--font-family)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {member.userName ?? member.userEmail ?? t('projects.detail.unknownMember')}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)',
                        fontFamily: 'var(--font-family)',
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                      }}>
                        {member.hourlyRate != null ? `${formatCurrency(member.hourlyRate)}/h` : '\u2014'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
