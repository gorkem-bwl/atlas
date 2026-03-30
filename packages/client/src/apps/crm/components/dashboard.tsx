import { useMemo } from 'react';
import {
  DollarSign, Trophy, Target, TrendingUp,
  CalendarDays, PhoneCall, Mail, StickyNote, Users as UsersIcon,
  Briefcase, Building2, Tag,
} from 'lucide-react';
import { useDashboard, type CrmDashboard, type CrmDeal, type CrmActivity } from '../hooks';
import { formatCurrencyCompact, formatDate } from '../../../lib/format';
import { Skeleton } from '../../../components/ui/skeleton';
import { ColumnHeader } from '../../../components/ui/column-header';

function getActivityIcon(type: string) {
  switch (type) {
    case 'call': return <PhoneCall size={13} />;
    case 'email': return <Mail size={13} />;
    case 'meeting': return <UsersIcon size={13} />;
    default: return <StickyNote size={13} />;
  }
}

function getActivityLabel(type: string): string {
  switch (type) {
    case 'call': return 'Call';
    case 'email': return 'Email';
    case 'meeting': return 'Meeting';
    case 'note': return 'Note';
    default: return type;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

function daysUntil(dateStr: string | null): string {
  if (!dateStr) return '--';
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}

// ─── KPI Cards ────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  subtitle,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  iconColor?: string;
}) {
  return (
    <div className="crm-kpi-card">
      <div className="crm-kpi-card-icon" style={{ color: iconColor }}>
        {icon}
      </div>
      <div className="crm-kpi-card-content">
        <span className="crm-kpi-card-label">{label}</span>
        <span className="crm-kpi-card-value">{value}</span>
        <span className="crm-kpi-card-subtitle">{subtitle}</span>
      </div>
    </div>
  );
}

// ─── Pipeline Bar Chart ───────────────────────────────────────────

function PipelineChart({
  valueByStage,
}: {
  valueByStage: CrmDashboard['valueByStage'];
}) {
  const maxValue = useMemo(
    () => Math.max(...valueByStage.map((s) => s.value), 1),
    [valueByStage],
  );

  if (valueByStage.length === 0) {
    return (
      <div className="crm-dashboard-card">
        <h3 className="crm-dashboard-card-title">Pipeline by stage</h3>
        <div className="crm-dashboard-empty">No active deals in pipeline</div>
      </div>
    );
  }

  return (
    <div className="crm-dashboard-card">
      <h3 className="crm-dashboard-card-title">Pipeline by stage</h3>
      <div className="crm-bar-chart">
        {valueByStage.map((stage) => (
          <div key={stage.stageId} className="crm-bar-row">
            <span className="crm-bar-label">{stage.stageName || 'Unknown'}</span>
            <div className="crm-bar-track">
              <div
                className="crm-bar"
                style={{
                  width: `${Math.max((stage.value / maxValue) * 100, 2)}%`,
                  backgroundColor: stage.stageColor || 'var(--color-accent-primary)',
                }}
              />
            </div>
            <span className="crm-bar-value">
              {formatCurrencyCompact(stage.value)}
              <span className="crm-bar-count">({stage.count} {stage.count === 1 ? 'deal' : 'deals'})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recent Activities ────────────────────────────────────────────

function RecentActivities({ activities }: { activities: CrmActivity[] }) {
  if (activities.length === 0) {
    return (
      <div className="crm-dashboard-card">
        <h3 className="crm-dashboard-card-title">Recent activities</h3>
        <div className="crm-dashboard-empty">No activities yet</div>
      </div>
    );
  }

  return (
    <div className="crm-dashboard-card">
      <h3 className="crm-dashboard-card-title">Recent activities</h3>
      <div className="crm-dashboard-activities">
        {activities.map((activity) => (
          <div key={activity.id} className="crm-activity-item">
            <div className="crm-activity-icon">
              {getActivityIcon(activity.type)}
            </div>
            <div className="crm-activity-body">
              <div className="crm-activity-text">{activity.body}</div>
              <div className="crm-activity-meta">
                {getActivityLabel(activity.type)} &middot; {timeAgo(activity.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Deals Table ──────────────────────────────────────────────────

function DealsTable({
  title,
  deals,
  showCloseDate,
}: {
  title: string;
  deals: CrmDeal[];
  showCloseDate?: boolean;
}) {
  if (deals.length === 0) {
    return (
      <div className="crm-dashboard-card">
        <h3 className="crm-dashboard-card-title">{title}</h3>
        <div className="crm-dashboard-empty">No deals to show</div>
      </div>
    );
  }

  return (
    <div className="crm-dashboard-card">
      <h3 className="crm-dashboard-card-title">{title}</h3>
      <div className="crm-dashboard-table-wrap">
        <table className="crm-dashboard-table">
          <thead>
            <tr>
              <th><ColumnHeader label="Deal" icon={<Briefcase size={12} />} /></th>
              <th><ColumnHeader label="Company" icon={<Building2 size={12} />} /></th>
              <th style={{ textAlign: 'right' }}><ColumnHeader label="Value" icon={<DollarSign size={12} />} /></th>
              {showCloseDate && <th><ColumnHeader label="Close date" icon={<CalendarDays size={12} />} /></th>}
              <th><ColumnHeader label="Stage" icon={<Tag size={12} />} /></th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id}>
                <td className="crm-dashboard-table-primary">{deal.title}</td>
                <td>{deal.companyName || '--'}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrencyCompact(deal.value)}
                </td>
                {showCloseDate && (
                  <td>
                    <span className="crm-dashboard-close-date">
                      <CalendarDays size={12} />
                      {daysUntil(deal.expectedCloseDate)}
                    </span>
                  </td>
                )}
                <td>
                  {deal.stageName && (
                    <span
                      className="crm-dashboard-stage-badge"
                      style={{
                        backgroundColor: `${deal.stageColor}18`,
                        color: deal.stageColor || undefined,
                        border: `1px solid ${deal.stageColor}30`,
                      }}
                    >
                      {deal.stageName}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="crm-dashboard">
      <div className="crm-kpi-row">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="crm-kpi-card">
            <Skeleton width={36} height={36} style={{ borderRadius: 'var(--radius-md)' }} />
            <div className="crm-kpi-card-content">
              <Skeleton width={80} height={12} />
              <Skeleton width={100} height={24} />
              <Skeleton width={60} height={10} />
            </div>
          </div>
        ))}
      </div>
      <div className="crm-dashboard-grid">
        <div className="crm-dashboard-card"><Skeleton width="100%" height={200} /></div>
        <div className="crm-dashboard-card"><Skeleton width="100%" height={200} /></div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────

export function CrmDashboard() {
  const { data: dashboard, isLoading } = useDashboard();

  if (isLoading || !dashboard) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="crm-dashboard">
      {/* KPI Cards */}
      <div className="crm-kpi-row">
        <KpiCard
          icon={<DollarSign size={18} />}
          iconColor="var(--color-accent-primary)"
          label="Total pipeline value"
          value={formatCurrencyCompact(dashboard.totalPipelineValue)}
          subtitle={`${dashboard.dealCount} active deal${dashboard.dealCount !== 1 ? 's' : ''}`}
        />
        <KpiCard
          icon={<Trophy size={18} />}
          iconColor="var(--color-success)"
          label="Deals won this month"
          value={`${dashboard.dealsWonCount}`}
          subtitle={`${formatCurrencyCompact(dashboard.dealsWonValue)} revenue`}
        />
        <KpiCard
          icon={<Target size={18} />}
          iconColor="var(--color-warning)"
          label="Win rate"
          value={`${dashboard.winRate}%`}
          subtitle={`${dashboard.dealsWonCount}W / ${dashboard.dealsLostCount}L this month`}
        />
        <KpiCard
          icon={<TrendingUp size={18} />}
          iconColor="#6366f1"
          label="Average deal size"
          value={formatCurrencyCompact(dashboard.averageDealSize)}
          subtitle="Across active deals"
        />
      </div>

      {/* Pipeline chart + recent activities */}
      <div className="crm-dashboard-grid">
        <PipelineChart valueByStage={dashboard.valueByStage} />
        <RecentActivities activities={dashboard.recentActivities} />
      </div>

      {/* Tables */}
      <div className="crm-dashboard-grid">
        <DealsTable
          title="Deals closing soon"
          deals={dashboard.dealsClosingSoon}
          showCloseDate
        />
        <DealsTable
          title="Top deals"
          deals={dashboard.topDeals}
        />
      </div>
    </div>
  );
}
