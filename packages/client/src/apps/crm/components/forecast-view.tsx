import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign, Trophy } from 'lucide-react';
import { useForecast, type CrmForecast } from '../hooks';
import { Skeleton } from '../../../components/ui/skeleton';

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function ForecastSkeleton() {
  return (
    <div style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width={200} height={80} style={{ borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
      <Skeleton width="100%" height={300} style={{ borderRadius: 'var(--radius-md)' }} />
    </div>
  );
}

export function ForecastView() {
  const { t } = useTranslation();
  const { data: forecast, isLoading } = useForecast();

  const maxValue = useMemo(() => {
    if (!forecast) return 1;
    return Math.max(...forecast.months.map((m) => m.weightedValue), 1);
  }, [forecast]);

  if (isLoading || !forecast) return <ForecastSkeleton />;

  return (
    <div style={{ padding: 'var(--spacing-xl)', maxWidth: 900 }}>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
        <div className="crm-kpi-card">
          <div className="crm-kpi-card-icon" style={{ color: 'var(--color-accent-primary)' }}>
            <TrendingUp size={18} />
          </div>
          <div className="crm-kpi-card-content">
            <span className="crm-kpi-card-label">{t('crm.forecast.weightedForecast')}</span>
            <span className="crm-kpi-card-value">{formatCurrency(forecast.totalWeighted)}</span>
            <span className="crm-kpi-card-subtitle">{t('crm.forecast.weightedForecast')}</span>
          </div>
        </div>
        <div className="crm-kpi-card">
          <div className="crm-kpi-card-icon" style={{ color: '#3b82f6' }}>
            <DollarSign size={18} />
          </div>
          <div className="crm-kpi-card-content">
            <span className="crm-kpi-card-label">{t('crm.forecast.bestCase')}</span>
            <span className="crm-kpi-card-value">{formatCurrency(forecast.bestCase)}</span>
            <span className="crm-kpi-card-subtitle">{t('crm.forecast.bestCase')}</span>
          </div>
        </div>
        <div className="crm-kpi-card">
          <div className="crm-kpi-card-icon" style={{ color: 'var(--color-success)' }}>
            <Trophy size={18} />
          </div>
          <div className="crm-kpi-card-content">
            <span className="crm-kpi-card-label">{t('crm.forecast.committed')}</span>
            <span className="crm-kpi-card-value">{formatCurrency(forecast.committed)}</span>
            <span className="crm-kpi-card-subtitle">{t('crm.forecast.committed')}</span>
          </div>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="crm-dashboard-card">
        <h3 className="crm-dashboard-card-title">{t('crm.forecast.monthlyForecast')}</h3>
        <div className="crm-bar-chart">
          {forecast.months.map((month) => (
            <div key={month.month} className="crm-bar-row">
              <span className="crm-bar-label" style={{ minWidth: 80 }}>{month.month}</span>
              <div className="crm-bar-track">
                <div
                  className="crm-bar"
                  style={{
                    width: `${Math.max((month.weightedValue / maxValue) * 100, 2)}%`,
                    backgroundColor: 'var(--color-accent-primary)',
                  }}
                />
              </div>
              <span className="crm-bar-value">{formatCurrency(month.weightedValue)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
