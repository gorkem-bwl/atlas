import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { CalendarEvent } from '@atlasmail/shared';
import { IconButton } from '../ui/icon-button';

interface MonthGridProps {
  selectedDate: string; // YYYY-MM-DD
  events: CalendarEvent[];
  selectedCalendarIds: Set<string>;
  calendarColorMap: Map<string, string>;
  weekStartsOnMonday?: boolean;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: string) => void;
}

const DAY_HEADERS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_HEADERS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Google Calendar event colorId → hex */
const EVENT_COLOR_MAP: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d50000',
};

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.6;
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'p' : 'a';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

const MAX_VISIBLE_EVENTS = 3;

export function MonthGrid({
  selectedDate,
  events,
  selectedCalendarIds,
  calendarColorMap,
  weekStartsOnMonday = false,
  onEventClick,
  onDateClick,
}: MonthGridProps) {
  const todayStr = useMemo(() => toYMD(new Date()), []);
  const selectedMonth = new Date(selectedDate + 'T12:00:00').getMonth();

  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const dayHeaders = weekStartsOnMonday ? DAY_HEADERS_MON : DAY_HEADERS_SUN;

  // Build the 6-week grid of dates
  const weeks = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const dow = firstOfMonth.getDay();
    const offset = weekStartsOnMonday ? ((dow + 6) % 7) : dow;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - offset);

    const rows: Date[][] = [];
    const cursor = new Date(gridStart);
    for (let w = 0; w < 6; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      rows.push(week);
    }
    // Remove last row if entirely in the next month
    if (rows[5][0].getMonth() !== selectedMonth && rows[5][6].getMonth() !== selectedMonth) {
      rows.pop();
    }
    return rows;
  }, [selectedDate, weekStartsOnMonday, selectedMonth]);

  // Group filtered events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (!selectedCalendarIds.has(ev.calendarId)) continue;
      const start = new Date(ev.startTime);
      const end = new Date(ev.endTime);
      // Add event to each day it spans
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      while (cursor < end) {
        const key = toYMD(cursor);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [events, selectedCalendarIds]);

  return (
    <div
      onClick={() => setExpandedDay(null)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Day header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--color-border-primary)',
          flexShrink: 0,
        }}
      >
        {dayHeaders.map((d) => (
          <div
            key={d}
            style={{
              padding: '6px 8px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {weeks.map((week, wi) => (
          <div
            key={wi}
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              minHeight: 0,
              borderBottom: wi < weeks.length - 1 ? '1px solid var(--color-border-secondary)' : undefined,
            }}
          >
            {week.map((day) => {
              const dayStr = toYMD(day);
              const isCurrentMonth = day.getMonth() === selectedMonth;
              const isToday = dayStr === todayStr;
              const dayEvents = eventsByDay.get(dayStr) || [];
              // Sort: all-day first, then by start time
              const sorted = [...dayEvents].sort((a, b) => {
                if (a.isAllDay && !b.isAllDay) return -1;
                if (!a.isAllDay && b.isAllDay) return 1;
                return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
              });
              const visible = sorted.slice(0, MAX_VISIBLE_EVENTS);
              const moreCount = sorted.length - visible.length;

              return (
                <div
                  key={dayStr}
                  onClick={() => onDateClick(dayStr)}
                  style={{
                    borderRight: '1px solid var(--color-border-secondary)',
                    padding: '2px 3px',
                    cursor: 'pointer',
                    overflow: 'visible',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: isCurrentMonth ? 1 : 0.4,
                    background: isToday ? 'color-mix(in srgb, var(--color-accent-primary) 5%, transparent)' : undefined,
                    position: 'relative',
                  }}
                >
                  {/* Date number */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      marginBottom: 1,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        fontSize: 11,
                        fontWeight: isToday ? 700 : 400,
                        color: isToday ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                        background: isToday ? 'var(--color-accent-primary)' : 'transparent',
                      }}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Event pills */}
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {visible.map((ev) => {
                      const evAny = ev as any;
                      const bgColor = evAny._color
                        || (ev.colorId && EVENT_COLOR_MAP[ev.colorId])
                        || calendarColorMap.get(ev.calendarId)
                        || 'var(--color-accent-primary)';
                      const isDeclined = ev.selfResponseStatus === 'declined';
                      const evSource: string | undefined = evAny._source;

                      if (ev.isAllDay) {
                        const textColor = isLightColor(bgColor) ? '#1a1a1a' : '#fff';
                        return (
                          <button
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              width: '100%',
                              padding: '1px 4px',
                              background: bgColor,
                              color: textColor,
                              border: 'none',
                              borderRadius: 3,
                              fontSize: 10,
                              fontWeight: 600,
                              fontFamily: 'var(--font-family)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: '15px',
                              opacity: isDeclined ? 0.45 : 1,
                              textDecoration: isDeclined ? 'line-through' : 'none',
                            }}
                          >
                            {evSource && evSource !== 'google' && (
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: '50%',
                                  background: '#fff',
                                  opacity: 0.7,
                                  display: 'inline-block',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ev.summary || '(No title)'}
                            </span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            width: '100%',
                            padding: '1px 4px',
                            background: 'transparent',
                            border: 'none',
                            fontSize: 10,
                            fontFamily: 'var(--font-family)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            lineHeight: '15px',
                            color: 'var(--color-text-primary)',
                            opacity: isDeclined ? 0.45 : 1,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: bgColor,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                            {formatTime(new Date(ev.startTime))}
                          </span>
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textDecoration: isDeclined ? 'line-through' : 'none',
                            }}
                          >
                            {ev.summary || '(No title)'}
                          </span>
                        </button>
                      );
                    })}

                    {moreCount > 0 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDay(expandedDay === dayStr ? null : dayStr);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            fontSize: 10,
                            color: 'var(--color-text-tertiary)',
                            padding: '0 4px',
                            fontWeight: 500,
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-family)',
                            lineHeight: '15px',
                            borderRadius: 3,
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-hover, rgba(0,0,0,0.05))';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                          }}
                        >
                          +{moreCount} more
                        </button>

                        {expandedDay === dayStr && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              zIndex: 20,
                              minWidth: 200,
                              maxWidth: 280,
                              background: 'var(--color-bg-elevated, #fff)',
                              border: '1px solid var(--color-border-primary, #d0d5dd)',
                              borderRadius: 'var(--radius-md, 6px)',
                              boxShadow: 'var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.12))',
                              padding: '6px 0',
                              marginTop: 2,
                            }}
                          >
                            {/* Popover header */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '2px 8px 6px',
                                borderBottom: '1px solid var(--color-border-secondary, #e4e7ec)',
                                marginBottom: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--color-text-secondary)',
                                }}
                              >
                                {new Date(dayStr + 'T12:00:00').toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <IconButton
                                icon={<X size={12} />}
                                label="Close"
                                size={20}
                                tooltip={false}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedDay(null);
                                }}
                              />
                            </div>

                            {/* All events for this day */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 4px' }}>
                              {sorted.map((ev) => {
                                const popEvAny = ev as any;
                                const bgColor = popEvAny._color
                                  || (ev.colorId && EVENT_COLOR_MAP[ev.colorId])
                                  || calendarColorMap.get(ev.calendarId)
                                  || 'var(--color-accent-primary)';
                                const isDeclined = ev.selfResponseStatus === 'declined';

                                if (ev.isAllDay) {
                                  const textColor = isLightColor(bgColor) ? '#1a1a1a' : '#fff';
                                  return (
                                    <button
                                      key={ev.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedDay(null);
                                        onEventClick(ev);
                                      }}
                                      style={{
                                        display: 'block',
                                        width: '100%',
                                        padding: '2px 6px',
                                        background: bgColor,
                                        color: textColor,
                                        border: 'none',
                                        borderRadius: 3,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        fontFamily: 'var(--font-family)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        lineHeight: '18px',
                                        opacity: isDeclined ? 0.45 : 1,
                                        textDecoration: isDeclined ? 'line-through' : 'none',
                                      }}
                                    >
                                      {ev.summary || '(No title)'}
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    key={ev.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedDay(null);
                                      onEventClick(ev);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      width: '100%',
                                      padding: '2px 6px',
                                      background: 'transparent',
                                      border: 'none',
                                      fontSize: 11,
                                      fontFamily: 'var(--font-family)',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap',
                                      lineHeight: '18px',
                                      color: 'var(--color-text-primary)',
                                      opacity: isDeclined ? 0.45 : 1,
                                      borderRadius: 3,
                                    }}
                                    onMouseEnter={(e) => {
                                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-hover, rgba(0,0,0,0.05))';
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: bgColor,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                                      {formatTime(new Date(ev.startTime))}
                                    </span>
                                    <span
                                      style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        textDecoration: isDeclined ? 'line-through' : 'none',
                                      }}
                                    >
                                      {ev.summary || '(No title)'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
