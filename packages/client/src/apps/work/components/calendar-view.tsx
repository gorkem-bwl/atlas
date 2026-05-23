import { useState, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Task } from '@atlas-platform/shared';
import { isClosedStatus } from '@atlas-platform/shared';
import { getTodayStr } from '../lib/helpers';
import { normalizePriority } from '../lib/constants';
import { Button } from '../../../components/ui/button';

type CalMode = 'month' | 'week' | 'day';

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ── Time-grid constants ──
const PX_PER_HOUR = 48;
const PX_PER_MIN = PX_PER_HOUR / 60;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;
const MIN_BLOCK_MIN = 30;

// Priority-based block colors (matches the TaskChip backgrounds).
function priorityBlockColor(priority: string): { bg: string; border: string } {
  switch (normalizePriority(priority)) {
    case 'high':
      return { bg: 'rgba(239, 68, 68, 0.16)', border: 'rgba(239, 68, 68, 0.6)' };
    case 'medium':
      return { bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.6)' };
    default:
      return { bg: 'var(--color-bg-tertiary)', border: 'var(--color-border-primary)' };
  }
}

const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Minutes from local midnight for a given Date.
const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

interface ScheduledBlock {
  task: Task;
  start: Date;
  end: Date;
  startMin: number; // clamped to [0, 1440] within the day
  endMin: number;
}

// Build the scheduled blocks for a given day key, clamping any task whose
// window spans the day boundary to that day's [0, 1440] range.
function blocksForDay(
  scheduled: Task[],
  dayKey: string,
): ScheduledBlock[] {
  const DEFAULT_BLOCK_MS = 30 * 60 * 1000; // start-only tasks get a 30-min block
  const out: ScheduledBlock[] = [];
  for (const task of scheduled) {
    const start = new Date(task.startAt as string);
    if (Number.isNaN(start.getTime())) continue;
    // End = endAt (the due datetime / block end) when valid and after start;
    // otherwise a short default block from the start.
    let end = task.endAt ? new Date(task.endAt) : null;
    if (!end || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + DEFAULT_BLOCK_MS);
    }
    // A task appears on a day if its start OR end lands on that day.
    const startKey = toKey(start);
    const endKey = toKey(end);
    if (startKey !== dayKey && endKey !== dayKey) continue;
    const startMin = startKey === dayKey ? minutesOfDay(start) : 0;
    const endMin = endKey === dayKey ? minutesOfDay(end) : 24 * 60;
    out.push({ task, start, end, startMin, endMin });
  }
  return out.sort((a, b) => a.startMin - b.startMin);
}

// Simple lane assignment: blocks that overlap in time share the column
// width side-by-side. Returns lane index + total lanes for each block.
function assignLanes(blocks: ScheduledBlock[]): Array<{ block: ScheduledBlock; lane: number; lanes: number }> {
  const laneEnds: number[] = []; // end-min of the last block in each lane
  const placed = blocks.map((block) => {
    let lane = laneEnds.findIndex((end) => end <= block.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(block.endMin);
    } else {
      laneEnds[lane] = block.endMin;
    }
    return { block, lane };
  });
  const lanes = Math.max(1, laneEnds.length);
  return placed.map((p) => ({ ...p, lanes }));
}

export function CalendarView({
  tasks,
  onSelectTask,
}: {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<CalMode>('month');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const todayStr = getTodayStr();
  const monthNames = t('tasks.calendar.monthNames', { returnObjects: true }) as string[];
  const dayNames = t('tasks.calendar.dayNames', { returnObjects: true }) as string[];

  // Open (non-closed) tasks only.
  const openTasks = useMemo(
    () => tasks.filter((task) => !isClosedStatus(task.status)),
    [tasks],
  );

  // Group tasks by due date for the Month view + the all-day/unscheduled
  // strip. Includes every open task with a dueDate.
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of openTasks) {
      if (task.dueDate) {
        const dateKey = task.dueDate.slice(0, 10);
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(task);
      }
    }
    return map;
  }, [openTasks]);

  // Tasks with a full scheduled window (both ends) → rendered as time
  // blocks in the Day/Week grids.
  const scheduledTasks = useMemo(
    () => openTasks.filter((task) => task.startAt),
    [openTasks],
  );

  // Tasks with a due date but NO startAt → the all-day/unscheduled strip.
  const unscheduledByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of openTasks) {
      if (task.dueDate && !task.startAt) {
        const dateKey = task.dueDate.slice(0, 10);
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(task);
      }
    }
    return map;
  }, [openTasks]);

  // ── Navigation (shifts by the active granularity) ──
  const shift = (dir: number) => {
    const d = new Date(currentDate);
    if (mode === 'month') d.setMonth(d.getMonth() + dir);
    else if (mode === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  // Sunday-anchored week containing currentDate.
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  let title: string;
  if (mode === 'month') {
    title = `${monthNames[month]} ${year}`;
  } else if (mode === 'week') {
    const a = weekDays[0], b = weekDays[6];
    title = `${a.getDate()} ${monthNames[a.getMonth()]} – ${b.getDate()} ${monthNames[b.getMonth()]} ${b.getFullYear()}`;
  } else {
    title = `${dayNames[currentDate.getDay()]}, ${currentDate.getDate()} ${monthNames[month]} ${year}`;
  }

  // Reusable task chip.
  const TaskChip = ({ task, small }: { task: Task; small?: boolean }) => (
    <button
      key={task.id}
      onClick={() => onSelectTask(task.id)}
      title={task.title}
      style={{
        display: 'block', width: '100%', padding: small ? '2px 4px' : '5px 8px',
        fontSize: small ? 10 : 13, lineHeight: small ? '14px' : '18px',
        color: 'var(--color-text-primary)',
        background: normalizePriority(task.priority) === 'high' ? 'rgba(239, 68, 68, 0.12)'
          : task.priority === 'medium' ? 'rgba(245, 158, 11, 0.12)'
          : 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
        textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: 'var(--font-family)',
      }}
    >
      {task.title || t('tasks.untitled')}
    </button>
  );

  const modeBtn = (m: CalMode, label: string) => (
    <Button variant={mode === m ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode(m)}>
      {label}
    </Button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0, gap: 'var(--spacing-md)',
      }}>
        <h2 style={{
          fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' as any,
          color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-family)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 2, marginRight: 'var(--spacing-sm)' }}>
            {modeBtn('month', t('tasks.calendar.month', 'Month'))}
            {modeBtn('week', t('tasks.calendar.week', 'Week'))}
            {modeBtn('day', t('tasks.calendar.day', 'Day'))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => shift(-1)}>
            <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>{t('tasks.calendar.today')}</Button>
          <Button variant="ghost" size="sm" onClick={() => shift(1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {mode === 'month' && <MonthGrid {...{ year, month, todayStr, dayNames, tasksByDate, TaskChip, t }} />}
      {mode === 'week' && (
        <WeekGrid
          weekDays={weekDays}
          todayStr={todayStr}
          dayNames={dayNames}
          scheduledTasks={scheduledTasks}
          unscheduledByDate={unscheduledByDate}
          onSelectTask={onSelectTask}
          t={t}
        />
      )}
      {mode === 'day' && (
        <DayView
          date={currentDate}
          todayStr={todayStr}
          scheduledTasks={scheduledTasks}
          unscheduledByDate={unscheduledByDate}
          onSelectTask={onSelectTask}
          t={t}
        />
      )}
    </div>
  );
}

// ── Month grid (classic) ──
function MonthGrid({ year, month, todayStr, dayNames, tasksByDate, TaskChip, t }: any) {
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const MAX = 3;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0 }}>
        {dayNames.map((day: string) => (
          <div key={day} style={{ padding: 'var(--spacing-sm) var(--spacing-xs)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' as any, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-family)' }}>{day}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', flex: 1, overflow: 'auto' }}>
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} style={{ borderRight: '1px solid var(--color-border-secondary)', borderBottom: '1px solid var(--color-border-secondary)', background: 'var(--color-bg-secondary)', minHeight: 80 }} />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const dayTasks = tasksByDate.get(dateStr) || [];
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          return (
            <div key={dateStr} style={{ borderRight: '1px solid var(--color-border-secondary)', borderBottom: '1px solid var(--color-border-secondary)', padding: 'var(--spacing-xs)', minHeight: 80, background: isToday ? 'var(--color-surface-selected)' : 'transparent', overflow: 'hidden' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: isToday ? 'var(--color-text-inverse)' : isPast ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)', fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: isToday ? 'var(--color-accent-primary)' : 'transparent' }}>{day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayTasks.slice(0, MAX).map((task: Task) => <TaskChip key={task.id} task={task} small />)}
                {dayTasks.length > MAX && <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', paddingLeft: 4, fontFamily: 'var(--font-family)' }}>{t('tasks.calendar.more', { count: dayTasks.length - MAX })}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Shared time-grid helpers ──

type TFn = ReturnType<typeof useTranslation>['t'];

interface DayColumnData {
  date: Date;
  key: string;
  isToday: boolean;
  blocks: ScheduledBlock[];
  unscheduled: Task[];
}

// Compute the visible hour range [startHour, endHour) across all days,
// expanding the default window to include any scheduled block.
function computeHourRange(days: DayColumnData[]): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const day of days) {
    for (const b of day.blocks) {
      startHour = Math.min(startHour, Math.floor(b.startMin / 60));
      endHour = Math.max(endHour, Math.ceil(b.endMin / 60));
    }
  }
  startHour = Math.max(0, startHour);
  endHour = Math.min(24, Math.max(endHour, startHour + 1));
  return { startHour, endHour };
}

// Absolutely-positioned task block inside a day column.
function TimeBlock({
  block, lane, lanes, rangeStartMin, onSelectTask, t,
}: {
  block: ScheduledBlock;
  lane: number;
  lanes: number;
  rangeStartMin: number;
  onSelectTask: (id: string) => void;
  t: TFn;
}) {
  const top = (block.startMin - rangeStartMin) * PX_PER_MIN;
  const height = Math.max(block.endMin - block.startMin, MIN_BLOCK_MIN) * PX_PER_MIN;
  const widthPct = 100 / lanes;
  const colors = priorityBlockColor(block.task.priority);
  return (
    <button
      onClick={() => onSelectTask(block.task.id)}
      title={`${block.task.title || t('tasks.untitled')} · ${fmtTime(block.start)}–${fmtTime(block.end)}`}
      style={{
        position: 'absolute',
        top, height,
        left: `calc(${lane * widthPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        background: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
        borderRadius: 'var(--radius-sm)',
        padding: '2px 6px',
        textAlign: 'left',
        overflow: 'hidden',
        cursor: 'pointer',
        fontFamily: 'var(--font-family)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <span style={{ fontSize: 12, lineHeight: '15px', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {block.task.title || t('tasks.untitled')}
      </span>
      <span style={{ fontSize: 10, lineHeight: '12px', color: 'var(--color-text-tertiary)' }}>
        {fmtTime(block.start)}–{fmtTime(block.end)}
      </span>
    </button>
  );
}

// The scrollable hour-grid body shared by Day and Week. Renders a left hour
// gutter and N day columns with absolutely-positioned task blocks.
function TimeGridBody({
  days, startHour, endHour, todayStr, onSelectTask, t,
}: {
  days: DayColumnData[];
  startHour: number;
  endHour: number;
  todayStr: string;
  onSelectTask: (id: string) => void;
  t: TFn;
}) {
  const rangeStartMin = startHour * 60;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * PX_PER_HOUR;

  // Current-time red line (only when today is among the columns and in range).
  const now = new Date();
  const nowMin = minutesOfDay(now);
  const showNow = nowMin >= rangeStartMin && nowMin <= endHour * 60;
  const nowTop = (nowMin - rangeStartMin) * PX_PER_MIN;
  const nowKey = toKey(now);

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', minHeight: gridHeight }}>
        {/* Hour gutter */}
        <div style={{ width: 52, flexShrink: 0, position: 'relative', borderRight: '1px solid var(--color-border-secondary)' }}>
          {hours.map((h) => (
            <div key={h} style={{ height: PX_PER_HOUR, position: 'relative' }}>
              <span style={{ position: 'absolute', top: -7, right: 6, fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                {pad(h)}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const placed = assignLanes(day.blocks);
          return (
            <div key={day.key} style={{ flex: 1, minWidth: 0, position: 'relative', borderRight: '1px solid var(--color-border-secondary)', background: day.isToday ? 'var(--color-surface-selected)' : 'transparent' }}>
              {/* Hour lines */}
              {hours.map((h) => (
                <div key={h} style={{ height: PX_PER_HOUR, borderBottom: '1px solid var(--color-border-secondary)' }} />
              ))}
              {/* Now line */}
              {showNow && day.key === nowKey && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: nowTop, height: 0, borderTop: '2px solid #ef4444', zIndex: 2 }} />
              )}
              {/* Blocks */}
              {placed.map(({ block, lane, lanes }) => (
                <TimeBlock
                  key={block.task.id}
                  block={block}
                  lane={lane}
                  lanes={lanes}
                  rangeStartMin={rangeStartMin}
                  onSelectTask={onSelectTask}
                  t={t}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// All-day / unscheduled strip (one cell per column).
function AllDayStrip({
  days, t, onSelectTask,
}: {
  days: DayColumnData[];
  t: TFn;
  onSelectTask: (id: string) => void;
}) {
  const hasAny = days.some((d) => d.unscheduled.length > 0);
  if (!hasAny) return null;
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0, maxHeight: 120, overflow: 'auto' }}>
      <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid var(--color-border-secondary)', display: 'flex', alignItems: 'flex-start', padding: '4px 6px' }}>
        <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-family)', lineHeight: '12px' }}>
          {t('tasks.calendar.allDay', 'All-day')}
        </span>
      </div>
      {days.map((day) => (
        <div key={day.key} style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--color-border-secondary)', padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {day.unscheduled.map((task) => (
            <button
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              title={task.title}
              style={{
                display: 'block', width: '100%', padding: '2px 6px', fontSize: 11, lineHeight: '15px',
                color: 'var(--color-text-primary)',
                background: normalizePriority(task.priority) === 'high' ? 'rgba(239, 68, 68, 0.12)'
                  : task.priority === 'medium' ? 'rgba(245, 158, 11, 0.12)'
                  : 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-family)',
              }}
            >
              {task.title || t('tasks.untitled')}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Week grid: hourly time-grid across 7 day columns ──
function WeekGrid({
  weekDays, todayStr, dayNames, scheduledTasks, unscheduledByDate, onSelectTask, t,
}: {
  weekDays: Date[];
  todayStr: string;
  dayNames: string[];
  scheduledTasks: Task[];
  unscheduledByDate: Map<string, Task[]>;
  onSelectTask: (id: string) => void;
  t: TFn;
}) {
  const days: DayColumnData[] = weekDays.map((d) => {
    const key = toKey(d);
    return {
      date: d, key, isToday: key === todayStr,
      blocks: blocksForDay(scheduledTasks, key),
      unscheduled: unscheduledByDate.get(key) || [],
    };
  });
  const { startHour, endHour } = computeHourRange(days);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Day headers */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0 }}>
        <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid var(--color-border-secondary)' }} />
        {days.map((day) => (
          <div key={day.key} style={{ flex: 1, minWidth: 0, padding: 'var(--spacing-sm)', textAlign: 'center', borderRight: '1px solid var(--color-border-secondary)', background: day.isToday ? 'var(--color-surface-selected)' : 'transparent' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-family)' }}>{dayNames[day.date.getDay()]}</div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' as any, color: day.isToday ? 'var(--color-accent-primary)' : 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>{day.date.getDate()}</div>
          </div>
        ))}
      </div>
      <AllDayStrip days={days} t={t} onSelectTask={onSelectTask} />
      <TimeGridBody days={days} startHour={startHour} endHour={endHour} todayStr={todayStr} onSelectTask={onSelectTask} t={t} />
    </div>
  );
}

// ── Day view: single-column hourly time-grid ──
function DayView({
  date, todayStr, scheduledTasks, unscheduledByDate, onSelectTask, t,
}: {
  date: Date;
  todayStr: string;
  scheduledTasks: Task[];
  unscheduledByDate: Map<string, Task[]>;
  onSelectTask: (id: string) => void;
  t: TFn;
}) {
  const key = toKey(date);
  const days: DayColumnData[] = [{
    date, key, isToday: key === todayStr,
    blocks: blocksForDay(scheduledTasks, key),
    unscheduled: unscheduledByDate.get(key) || [],
  }];
  const { startHour, endHour } = computeHourRange(days);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <AllDayStrip days={days} t={t} onSelectTask={onSelectTask} />
      <TimeGridBody days={days} startHour={startHour} endHour={endHour} todayStr={todayStr} onSelectTask={onSelectTask} t={t} />
    </div>
  );
}
