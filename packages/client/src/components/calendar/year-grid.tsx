import React, { useMemo } from 'react';
import { useCalendarStore } from '../../stores/calendar-store';
import { useCalendarEvents } from '../../hooks/use-calendar';
import type { CalendarEvent } from '@atlas-platform/shared';
import type { CSSProperties } from 'react';

interface YearGridProps {
  weekStartsOnMonday: boolean;
}

export function YearGrid({ weekStartsOnMonday }: YearGridProps) {
  const { selectedDate, setSelectedDate, setView } = useCalendarStore();
  const year = parseInt(selectedDate.split('-')[0], 10);

  // Fetch events for the entire year
  const timeMin = `${year}-01-01T00:00:00Z`;
  const timeMax = `${year}-12-31T23:59:59Z`;
  const { data: events = [] } = useCalendarEvents(timeMin, timeMax);

  // Build a set of dates that have events for fast lookup
  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    events.forEach((event: CalendarEvent) => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      // Add each day the event spans
      const current = new Date(start);
      current.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(0, 0, 0, 0);
      while (current <= endDay) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        dates.add(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  }, [events]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const months = Array.from({ length: 12 }, (_, i) => i);
  const dayLabels = weekStartsOnMonday
    ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setView('day');
  };

  const handleMonthClick = (month: number) => {
    const m = String(month + 1).padStart(2, '0');
    setSelectedDate(`${year}-${m}-01`);
    setView('month-grid');
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--spacing-2xl)',
        padding: 'var(--spacing-2xl)',
        maxWidth: 1200,
        margin: '0 auto',
        overflow: 'auto',
        height: '100%',
      }}
    >
      {months.map((month) => (
        <MiniMonth
          key={month}
          year={year}
          month={month}
          weekStartsOnMonday={weekStartsOnMonday}
          dayLabels={dayLabels}
          eventDates={eventDates}
          todayStr={todayStr}
          onDayClick={handleDayClick}
          onMonthClick={handleMonthClick}
        />
      ))}
    </div>
  );
}

interface MiniMonthProps {
  year: number;
  month: number;
  weekStartsOnMonday: boolean;
  dayLabels: string[];
  eventDates: Set<string>;
  todayStr: string;
  onDayClick: (dateStr: string) => void;
  onMonthClick: (month: number) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function MiniMonth({
  year, month, weekStartsOnMonday, dayLabels, eventDates, todayStr,
  onDayClick, onMonthClick,
}: MiniMonthProps) {
  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDow = firstDay.getDay(); // 0=Sun
    if (weekStartsOnMonday) {
      startDow = startDow === 0 ? 6 : startDow - 1;
    }

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return cells;
  }, [year, month, weekStartsOnMonday]);

  const monthBtnStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-family)',
    marginBottom: 8,
    padding: 0,
  };

  return (
    <div style={{ userSelect: 'none' }}>
      <button
        onClick={() => onMonthClick(month)}
        style={monthBtnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
      >
        {MONTH_NAMES[month]}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
        {dayLabels.map((label) => (
          <div
            key={label}
            style={{
              fontSize: 10,
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
              paddingBottom: 4,
              fontFamily: 'var(--font-family)',
            }}
          >
            {label}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const m = String(month + 1).padStart(2, '0');
          const d = String(day).padStart(2, '0');
          const dateStr = `${year}-${m}-${d}`;
          const isToday = dateStr === todayStr;
          const hasEvent = eventDates.has(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              style={{
                position: 'relative',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'var(--font-family)',
                fontWeight: isToday ? 700 : 400,
                background: isToday ? 'var(--color-accent-primary)' : 'transparent',
                color: isToday ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                transition: 'background var(--transition-fast)',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                if (!isToday) e.currentTarget.style.background = 'var(--color-surface-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isToday) e.currentTarget.style.background = 'transparent';
              }}
            >
              {day}
              {hasEvent && !isToday && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--color-accent-primary)',
                  }}
                />
              )}
              {hasEvent && isToday && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--color-text-inverse)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
