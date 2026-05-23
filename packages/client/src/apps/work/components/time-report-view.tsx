import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ChevronRight, Clock } from 'lucide-react';
import { isTenantAdmin } from '@atlas-platform/shared';
import { ContentArea } from '../../../components/ui/content-area';
import { Button } from '../../../components/ui/button';
import { QueryErrorState } from '../../../components/ui/query-error-state';
import { Skeleton } from '../../../components/ui/skeleton';
import { useAuthStore } from '../../../stores/auth-store';
import { useTeamTimeReport, type TimeReportUser } from '../hooks';

// minutes → "Xh Ym" (matches task-time-section formatting).
function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h && rem) return `${h}h ${rem}m`;
  if (h) return `${h}h`;
  return `${rem}m`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Preset = 'week' | 'month' | 'last30' | 'custom';

function rangeForPreset(preset: Preset): { from: string; to: string } {
  const now = new Date();
  if (preset === 'week') {
    // Monday-anchored current week.
    const day = now.getDay(); // 0=Sun
    const diffToMon = (day + 6) % 7;
    const start = new Date(now); start.setDate(now.getDate() - diffToMon);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { from: toKey(start), to: toKey(end) };
  }
  if (preset === 'last30') {
    const start = new Date(now); start.setDate(now.getDate() - 29);
    return { from: toKey(start), to: toKey(now) };
  }
  // month (default)
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toKey(first), to: toKey(last) };
}

export function TimeReportView() {
  const { t } = useTranslation();
  const { tenantRole, isSuperAdmin } = useAuthStore();
  const isAdmin = isSuperAdmin || isTenantAdmin(tenantRole);

  const [preset, setPreset] = useState<Preset>('month');
  const monthRange = useMemo(() => rangeForPreset('month'), []);
  const [from, setFrom] = useState(monthRange.from);
  const [to, setTo] = useState(monthRange.to);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useTeamTimeReport(from, to, isAdmin);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') {
      const r = rangeForPreset(p);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const toggleExpand = (userId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  if (!isAdmin) {
    return (
      <ContentArea title={t('work.timeReport.title')}>
        <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
          {t('work.timeReport.adminOnly', 'Admin access required')}
        </div>
      </ContentArea>
    );
  }

  const presetBtn = (p: Preset, label: string) => (
    <Button variant={preset === p ? 'secondary' : 'ghost'} size="sm" onClick={() => applyPreset(p)}>
      {label}
    </Button>
  );

  const maxMinutes = data?.users.reduce((m, u) => Math.max(m, u.totalMinutes), 0) ?? 0;

  return (
    <ContentArea title={t('work.timeReport.title')}>
      <div style={{ padding: 'var(--spacing-xl)', overflow: 'auto', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: 960 }}>

          {/* Date range presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {presetBtn('week', t('work.timeReport.thisWeek'))}
              {presetBtn('month', t('work.timeReport.thisMonth'))}
              {presetBtn('last30', t('work.timeReport.last30'))}
              {presetBtn('custom', t('work.timeReport.custom'))}
            </div>
            {preset === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <input type="date" className="task-date-input" value={from} max={to}
                  onChange={(e) => setFrom(e.target.value)} />
                <span style={{ color: 'var(--color-text-tertiary)' }}>–</span>
                <input type="date" className="task-date-input" value={to} min={from}
                  onChange={(e) => setTo(e.target.value)} />
              </div>
            )}
          </div>

          {/* Summary header */}
          <div style={{
            display: 'flex', gap: 'var(--spacing-xl)', flexWrap: 'wrap',
            background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-secondary)',
            borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-xl)',
          }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
                {t('work.timeReport.totalTeamHours')}
              </div>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                {formatMinutes(data?.totalMinutes ?? 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
                {t('work.timeReport.billableHours')}
              </div>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: '#22c55e', fontFamily: 'var(--font-family)' }}>
                {formatMinutes(data?.totalBillableMinutes ?? 0)}
              </div>
            </div>
          </div>

          {/* Table */}
          {isError ? (
            <QueryErrorState onRetry={() => refetch()} />
          ) : isLoading || !data ? (
            <Skeleton height={240} />
          ) : data.users.length === 0 ? (
            <div style={{
              padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)',
            }}>
              <Clock size={28} />
              {t('work.timeReport.empty')}
            </div>
          ) : (
            <div style={{ border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '24px 1fr 130px 130px 90px', gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm) var(--spacing-lg)', borderBottom: '1px solid var(--color-border-secondary)',
                background: 'var(--color-bg-secondary)',
                fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
                letterSpacing: '0.04em', fontFamily: 'var(--font-family)', fontWeight: 'var(--font-weight-semibold)',
              }}>
                <span />
                <span>{t('work.timeReport.colUser')}</span>
                <span style={{ textAlign: 'right' }}>{t('work.timeReport.colTotalHours')}</span>
                <span style={{ textAlign: 'right' }}>{t('work.timeReport.colBillableHours')}</span>
                <span style={{ textAlign: 'right' }}>{t('work.timeReport.colEntries')}</span>
              </div>

              {data.users.map((user) => (
                <UserRow
                  key={user.userId}
                  user={user}
                  maxMinutes={maxMinutes}
                  expanded={expanded.has(user.userId)}
                  onToggle={() => toggleExpand(user.userId)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ContentArea>
  );
}

function UserRow({
  user, maxMinutes, expanded, onToggle, t,
}: {
  user: TimeReportUser;
  maxMinutes: number;
  expanded: boolean;
  onToggle: () => void;
  t: TFunction;
}) {
  const barPct = maxMinutes > 0 ? (user.totalMinutes / maxMinutes) * 100 : 0;
  return (
    <div style={{ borderBottom: '1px solid var(--color-border-secondary)' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'grid', gridTemplateColumns: '24px 1fr 130px 130px 90px', gap: 'var(--spacing-sm)',
          alignItems: 'center', width: '100%', padding: 'var(--spacing-sm) var(--spacing-lg)',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 120ms', color: 'var(--color-text-tertiary)' }} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.userName}</span>
          <span style={{ height: 4, borderRadius: 2, background: 'var(--color-bg-tertiary)', overflow: 'hidden', width: '100%', maxWidth: 220 }}>
            <span style={{ display: 'block', height: '100%', width: `${barPct}%`, background: 'var(--color-accent-primary)' }} />
          </span>
        </span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatMinutes(user.totalMinutes)}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>{formatMinutes(user.billableMinutes)}</span>
        <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>{user.entryCount}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 var(--spacing-lg) var(--spacing-md) 48px', display: 'flex', gap: 'var(--spacing-2xl)', flexWrap: 'wrap' }}>
          {/* By project */}
          <div style={{ minWidth: 220 }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-family)', marginBottom: 'var(--spacing-xs)' }}>
              {t('work.timeReport.byProject')}
            </div>
            {user.byProject.map((p) => (
              <div key={p.projectId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-sm)', padding: '2px 0', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.projectColor || 'var(--color-text-tertiary)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.projectName}</span>
                </span>
                <span style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{formatMinutes(p.minutes)}</span>
              </div>
            ))}
          </div>

          {/* By task */}
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-family)', marginBottom: 'var(--spacing-xs)' }}>
              {t('work.timeReport.byTask')}
            </div>
            {user.byTask.map((tk, i) => (
              <div key={tk.taskId ?? `none-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-sm)', padding: '2px 0', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)' }}>
                <span style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.taskDescription}</span>
                <span style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{formatMinutes(tk.minutes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
