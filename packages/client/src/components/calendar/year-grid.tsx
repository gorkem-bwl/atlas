import React, { useMemo } from 'react';
import { useCalendarStore } from '../../stores/calendar-store';
import { useCalendarEvents } from '../../hooks/use-calendar';
import type { CalendarEvent } from '@atlasmail/shared';

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
    <div className="grid grid-cols-4 gap-6 p-6 max-w-[1200px] mx-auto">
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

  return (
    <div className="select-none">
      <button
        onClick={() => onMonthClick(month)}
        className="text-sm font-semibold mb-2 hover:text-blue-600 transition-colors cursor-pointer"
      >
        {MONTH_NAMES[month]}
      </button>
      <div className="grid grid-cols-7 gap-0">
        {dayLabels.map((label) => (
          <div key={label} className="text-[10px] text-center text-gray-400 pb-1">
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
              className={`
                relative text-[11px] w-6 h-6 flex items-center justify-center rounded-full
                cursor-pointer transition-colors
                ${isToday ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100 text-gray-700'}
              `}
            >
              {day}
              {hasEvent && !isToday && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
              )}
              {hasEvent && isToday && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
