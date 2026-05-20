import { useState, useEffect, useMemo } from 'react';
import { Play, Square, Plus, X, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Task, TaskProject } from '@atlas-platform/shared';
import {
  useTaskTimeEntries, useLogTaskTime, useDeleteTaskTimeEntry,
  useActiveTimer, useStartTaskTimer, useStopTimer,
} from '../hooks';
import { useAppActions } from '../../../hooks/use-app-permissions';
import { IconButton } from '../../../components/ui/icon-button';
import { Select } from '../../../components/ui/select';

// minutes → "1h 30m" / "45m" / "0m"
function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h && rem) return `${h}h ${rem}m`;
  if (h) return `${h}h`;
  return `${rem}m`;
}

// Live elapsed since an ISO start, as "H:MM:SS".
function elapsedLabel(startedAtIso: string, nowMs: number): string {
  const secs = Math.max(0, Math.floor((nowMs - new Date(startedAtIso).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`;
}

export function TaskTimeSection({ task, projects }: { task: Task; projects: TaskProject[] }) {
  const { t } = useTranslation();
  const { canCreate, canDelete } = useAppActions('work');
  const { data } = useTaskTimeEntries(task.id);
  const { data: activeTimer } = useActiveTimer();
  const logTime = useLogTaskTime();
  const deleteEntry = useDeleteTaskTimeEntry();
  const startTimer = useStartTaskTimer();
  const stopTimer = useStopTimer();

  // When the task has no project, the user must pick one before tracking.
  const [pickedProjectId, setPickedProjectId] = useState<string | null>(null);
  const effectiveProjectId = task.projectId ?? pickedProjectId;

  const [showManual, setShowManual] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');

  // Tick once a second only while this task's timer is running.
  const isRunningHere = activeTimer?.taskId === task.id;
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!isRunningHere) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunningHere]);

  const entries = data?.entries ?? [];
  const totalMinutes = data?.totalMinutes ?? 0;

  const projectOptions = useMemo(
    () => projects.filter(p => !p.isArchived).map(p => ({ value: p.id, label: p.title })),
    [projects],
  );

  const needsProject = !effectiveProjectId;

  const handleStart = () => {
    if (!effectiveProjectId) return;
    startTimer.mutate({ taskId: task.id, projectId: effectiveProjectId });
  };

  const handleStop = () => {
    stopTimer.mutate(task.id);
  };

  const handleLogManual = () => {
    const total = (parseInt(hours || '0', 10) * 60) + parseInt(minutes || '0', 10);
    if (total <= 0 || !effectiveProjectId) return;
    logTime.mutate(
      { taskId: task.id, projectId: effectiveProjectId, durationMinutes: total, notes: notes.trim() || null },
      {
        onSuccess: () => {
          setHours(''); setMinutes(''); setNotes(''); setShowManual(false);
        },
      },
    );
  };

  return (
    <div style={{ padding: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border-secondary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <Clock size={15} />
          <span>{t('tasks.timeTracking', 'Time tracking')}</span>
          {totalMinutes > 0 && (
            <span style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              · {formatMinutes(totalMinutes)}
            </span>
          )}
        </div>
        {canCreate && !needsProject && (
          <IconButton
            icon={<Plus size={16} />}
            label={t('tasks.logTime', 'Log time')}
            onClick={() => setShowManual(v => !v)}
          />
        )}
      </div>

      {/* Inline project picker — tracking requires a project. */}
      {needsProject ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {t('tasks.attachProjectToTrack', 'Attach this task to a project to track time')}
          </span>
          <Select
            value=""
            onChange={(value) => setPickedProjectId(value || null)}
            options={[{ value: '', label: t('tasks.selectProject', 'Select a project…') }, ...projectOptions]}
          />
        </div>
      ) : (
        <>
          {/* Live timer controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isRunningHere ? (
              <>
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={stopTimer.isPending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                    background: 'var(--color-danger)', color: '#fff', fontSize: 13, fontWeight: 500,
                  }}
                >
                  <Square size={14} /> {t('tasks.stopTimer', 'Stop')}
                </button>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {activeTimer && elapsedLabel(activeTimer.startedAt, nowMs)}
                </span>
              </>
            ) : (
              canCreate && (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={startTimer.isPending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)',
                    cursor: 'pointer', background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500,
                  }}
                >
                  <Play size={14} /> {t('tasks.startTimer', 'Start timer')}
                </button>
              )
            )}
            {activeTimer && !isRunningHere && (
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {t('tasks.timerRunningElsewhere', 'A timer is running on another task')}
              </span>
            )}
          </div>

          {/* Manual entry form */}
          {showManual && canCreate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number" min={0} placeholder="0" value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  style={{ width: 56, padding: '6px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>h</span>
                <input
                  type="number" min={0} max={59} placeholder="0" value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  style={{ width: 56, padding: '6px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>m</span>
                <input
                  type="text" placeholder={t('tasks.timeNotePlaceholder', 'Note (optional)')} value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-primary)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
                />
                <button
                  type="button" onClick={handleLogManual} disabled={logTime.isPending}
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 500 }}
                >
                  {t('common.add', 'Add')}
                </button>
              </div>
            </div>
          )}

          {/* Entry list */}
          {entries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'var(--spacing-md)' }}>
              {entries.map(entry => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {formatMinutes(entry.durationMinutes)}
                    </span>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>{entry.workDate}</span>
                    {entry.notes && (
                      <span style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.notes}
                      </span>
                    )}
                  </div>
                  {canDelete && (
                    <IconButton
                      icon={<X size={14} />}
                      label={t('common.delete', 'Delete')}
                      onClick={() => deleteEntry.mutate({ taskId: task.id, entryId: entry.id })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
