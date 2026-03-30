import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardCharts, type CrmDashboardCharts } from '../hooks';
import { formatCurrencyCompact } from '../../../lib/format';
import { Skeleton } from '../../../components/ui/skeleton';

// ─── Win/Loss by month ──────────────────────────────────────────

function WinLossChart({ data }: { data: CrmDashboardCharts['winLossByMonth'] }) {
  const { t } = useTranslation();
  const maxVal = useMemo(() => Math.max(...data.map((d) => Math.max(d.won, d.lost)), 1), [data]);

  return (
    <div className="crm-dashboard-card">
      <h3 className="crm-dashboard-card-title">{t('crm.charts.winLoss')}</h3>
      {data.every((d) => d.won === 0 && d.lost === 0) ? (
        <div className="crm-dashboard-empty">{t('crm.dashboard.noData')}</div>
      ) : (
        <div className="crm-bar-chart">
          {data.map((d) => (
            <div key={d.month} className="crm-bar-row" style={{ gap: 'var(--spacing-xs)' }}>
              <span className="crm-bar-label" style={{ minWidth: 70 }}>{d.month}</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div className="crm-bar-track">
                  <div className="crm-bar" style={{ width: `${Math.max((d.won / maxVal) * 100, d.won > 0 ? 2 : 0)}%`, backgroundColor: 'var(--color-success)' }} />
                </div>
                <div className="crm-bar-track">
                  <div className="crm-bar" style={{ width: `${Math.max((d.lost / maxVal) * 100, d.lost > 0 ? 2 : 0)}%`, backgroundColor: 'var(--color-error)' }} />
                </div>
              </div>
              <span className="crm-bar-value" style={{ minWidth: 50 }}>
                <span style={{ color: 'var(--color-success)' }}>{d.won}W</span>{' '}
                <span style={{ color: 'var(--color-error)' }}>{d.lost}L</span>
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-sm)', paddingLeft: 70 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-success)', display: 'inline-block' }} /> {t('crm.charts.won')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-error)', display: 'inline-block' }} /> {t('crm.charts.lost')}
        </div>
      </div>
    </div>
  );
}

// ─── Revenue trend ──────────────────────────────────────────────

function RevenueTrendChart({ data }: { data: CrmDashboardCharts['revenueTrend'] }) {
  const { t } = useTranslation();
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.revenue), 1), [data]);

  return (
    <div className="crm-dashboard-card">
      <h3 className="crm-dashboard-card-title">{t('crm.charts.revenueTrend')}</h3>
      {data.every((d) => d.revenue === 0) ? (
        <div className="crm-dashboard-empty">{t('crm.dashboard.noData')}</div>
      ) : (
        <div className="crm-bar-chart">
          {data.map((d) => (
            <div key={d.month} className="crm-bar-row">
              <span className="crm-bar-label" style={{ minWidth: 70 }}>{d.month}</span>
              <div className="crm-bar-track">
                <div className="crm-bar" style={{ width: `${Math.max((d.revenue / maxVal) * 100, d.revenue > 0 ? 2 : 0)}%`, backgroundColor: '#3b82f6' }} />
              </div>
              <span className="crm-bar-value">{formatCurrencyCompact(d.revenue)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Conversion funnel ──────────────────────────────────────────

function ConversionFunnelChart({ data }: { data: CrmDashboardCharts['conversionFunnel'] }) {
  const { t } = useTranslation();
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  return (
    <div className="crm-dashboard-card">
      <h3 className="crm-dashboard-card-title">{t('crm.charts.conversionFunnel')}</h3>
      {data.length === 0 ? (
        <div className="crm-dashboard-empty">{t('crm.dashboard.noData')}</div>
      ) : (
        <div className="crm-bar-chart">
          {data.map((d) => (
            <div key={d.stage} className="crm-bar-row">
              <span className="crm-bar-label" style={{ minWidth: 90 }}>{d.stage}</span>
              <div className="crm-bar-track">
                <div className="crm-bar" style={{ width: `${Math.max((d.count / maxVal) * 100, 2)}%`, backgroundColor: d.stageColor }} />
              </div>
              <span className="crm-bar-value">{d.count} {t('crm.charts.deals')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Deals by source ────────────────────────────────────────────

function DealsBySourceChart({ data }: { data: CrmDashboardCharts['dealsBySource'] }) {
  const { t } = useTranslation();
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  return (
    <div className="crm-dashboard-card">
      <h3 className="crm-dashboard-card-title">{t('crm.charts.dealsBySource')}</h3>
      {data.length === 0 ? (
        <div className="crm-dashboard-empty">{t('crm.dashboard.noData')}</div>
      ) : (
        <div className="crm-bar-chart">
          {data.map((d, i) => (
            <div key={d.source} className="crm-bar-row">
              <span className="crm-bar-label" style={{ minWidth: 80 }}>{d.source}</span>
              <div className="crm-bar-track">
                <div className="crm-bar" style={{ width: `${Math.max((d.value / maxVal) * 100, d.value > 0 ? 2 : 0)}%`, backgroundColor: colors[i % colors.length] }} />
              </div>
              <span className="crm-bar-value">
                {formatCurrencyCompact(d.value)}
                <span className="crm-bar-count" style={{ marginLeft: 4 }}>({d.count})</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sales cycle length ─────────────────────────────────────────

function SalesCycleChart({ data }: { data: CrmDashboardCharts['salesCycleLength'] }) {
  const { t } = useTranslation();
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.avgDays), 1), [data]);

  return (
    <div className="crm-dashboard-card">
      <h3 className="crm-dashboard-card-title">{t('crm.charts.salesCycle')}</h3>
      {data.every((d) => d.avgDays === 0) ? (
        <div className="crm-dashboard-empty">{t('crm.dashboard.noData')}</div>
      ) : (
        <div className="crm-bar-chart">
          {data.map((d) => (
            <div key={d.month} className="crm-bar-row">
              <span className="crm-bar-label" style={{ minWidth: 70 }}>{d.month}</span>
              <div className="crm-bar-track">
                <div className="crm-bar" style={{ width: `${Math.max((d.avgDays / maxVal) * 100, d.avgDays > 0 ? 2 : 0)}%`, backgroundColor: '#8b5cf6' }} />
              </div>
              <span className="crm-bar-value">{d.avgDays} {t('crm.charts.days')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ───────────────────────────────────────────

function ChartsSkeleton() {
  return (
    <div className="crm-dashboard-grid">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="crm-dashboard-card">
          <Skeleton width="60%" height={16} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={150} />
        </div>
      ))}
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────

export function DashboardCharts() {
  const { data: charts, isLoading } = useDashboardCharts();

  if (isLoading || !charts) return <ChartsSkeleton />;

  return (
    <>
      <div className="crm-dashboard-grid">
        <WinLossChart data={charts.winLossByMonth} />
        <RevenueTrendChart data={charts.revenueTrend} />
      </div>
      <div className="crm-dashboard-grid">
        <ConversionFunnelChart data={charts.conversionFunnel} />
        <DealsBySourceChart data={charts.dealsBySource} />
      </div>
      <div className="crm-dashboard-grid">
        <SalesCycleChart data={charts.salesCycleLength} />
      </div>
    </>
  );
}
