import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../lib/format';
import { Clock } from 'lucide-react';
import type { CrmActivity } from '../../hooks';
import { getActivityIcon, getActivityLabel } from '../../lib/crm-helpers';

export function ActivitiesListView({
  activities, searchQuery,
}: {
  activities: CrmActivity[];
  searchQuery: string;
}) {
  const { t } = useTranslation();
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.toLowerCase();
    return activities.filter((a) =>
      a.body.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q),
    );
  }, [activities, searchQuery]);

  if (filtered.length === 0) {
    return (
      <div className="crm-empty-state">
        <Clock size={48} className="crm-empty-state-icon" />
        <div className="crm-empty-state-title">{searchQuery ? t('crm.empty.noMatchingActivities') : t('crm.activities.noActivities')}</div>
        <div className="crm-empty-state-desc">{searchQuery ? t('crm.empty.tryDifferentSearch') : t('crm.empty.logFirstActivity')}</div>
      </div>
    );
  }

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, CrmActivity[]> = {};
    for (const a of filtered) {
      const date = formatDate(a.createdAt);
      if (!map[date]) map[date] = [];
      map[date].push(a);
    }
    return Object.entries(map);
  }, [filtered]);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
      {grouped.map(([date, items]) => (
        <div key={date} style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={{
            fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em',
            marginBottom: 'var(--spacing-sm)', fontFamily: 'var(--font-family)',
          }}>
            {date}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((activity) => (
              <div key={activity.id} className="crm-activity-item">
                <div className="crm-activity-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="crm-activity-body">
                  <div className="crm-activity-text">{activity.body}</div>
                  <div className="crm-activity-meta">
                    {getActivityLabel(activity.type, t)} &middot; {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
