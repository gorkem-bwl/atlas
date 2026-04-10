import type { CalendarEvent } from '@atlas-platform/shared';
import { MapPin, Video } from 'lucide-react';

/*
 * Usage example:
 *
 * <AgendaView
 *   events={filteredEvents}
 *   selectedCalendarIds={selectedCalendarIds}
 *   calendarColorMap={calendarColorMap}
 *   onEventClick={openEditModal}
 * />
 */

interface AgendaViewProps {
  events: CalendarEvent[];
  selectedCalendarIds: Set<string>;
  calendarColorMap: Map<string, string>;
  onEventClick: (event: CalendarEvent) => void;
}

/** Google Calendar event colorId → hex (mirrors week-grid.tsx) */
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

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDayHeader(dateStr: string, todayYMD: string): string {
  const tomorrow = new Date(todayYMD + 'T12:00:00');
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowYMD = toYMD(tomorrow);

  if (dateStr === todayYMD) {
    const d = new Date(dateStr + 'T12:00:00');
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Today \u2013 ${weekday}, ${monthDay}`;
  }
  if (dateStr === tomorrowYMD) {
    const d = new Date(dateStr + 'T12:00:00');
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Tomorrow \u2013 ${weekday}, ${monthDay}`;
  }
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function AgendaView({ events, selectedCalendarIds, calendarColorMap, onEventClick }: AgendaViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayYMD = toYMD(today);

  // Filter to selected calendars and events starting today or in the future
  const upcomingEvents = events.filter((ev) => {
    if (!selectedCalendarIds.has(ev.calendarId)) return false;
    const startDate = new Date(ev.startTime);
    startDate.setHours(0, 0, 0, 0);
    return startDate >= today;
  });

  // Group events by day (YYYY-MM-DD of their start date)
  const grouped = new Map<string, CalendarEvent[]>();
  for (const ev of upcomingEvents) {
    const key = toYMD(new Date(ev.startTime));
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ev);
  }

  // Sort days ascending, then sort events within each day by time
  const sortedDays = Array.from(grouped.keys()).sort();
  for (const day of sortedDays) {
    grouped.get(day)!.sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }

  if (sortedDays.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        No upcoming events
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        height: '100%',
        fontFamily: 'var(--font-family)',
        background: 'var(--color-bg-primary)',
      }}
    >
      {sortedDays.map((dayYMD) => {
        const dayEvents = grouped.get(dayYMD)!;
        const isToday = dayYMD === todayYMD;

        return (
          <div key={dayYMD}>
            {/* Day header */}
            <div
              style={{
                padding: '16px 24px 6px 24px',
                position: 'sticky',
                top: 0,
                background: 'var(--color-bg-primary)',
                zIndex: 2,
                borderBottom: '1px solid var(--color-border-primary)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  color: isToday ? 'var(--color-accent-primary, #13715B)' : 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {formatDayHeader(dayYMD, todayYMD)}
              </span>
            </div>

            {/* Events for this day */}
            <div style={{ paddingBottom: 4 }}>
              {dayEvents.map((ev) => {
                const baseColor = ev._color || calendarColorMap.get(ev.calendarId) || '#5a7fa0';
                const color = ev._color || (ev.colorId ? (EVENT_COLOR_MAP[ev.colorId] ?? baseColor) : baseColor);

                return (
                  <AgendaEventRow
                    key={ev.id}
                    event={ev}
                    color={color}
                    onEventClick={onEventClick}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AgendaEventRowProps {
  event: CalendarEvent;
  color: string;
  onEventClick: (event: CalendarEvent) => void;
}

function AgendaEventRow({ event, color, onEventClick }: AgendaEventRowProps) {
  const timeLabel = event.isAllDay
    ? 'All day'
    : `${formatTime(event.startTime)} \u2013 ${formatTime(event.endTime)}`;
  const isDeclined = event.selfResponseStatus === 'declined';

  return (
    <button
      onClick={() => onEventClick(event)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        width: '100%',
        padding: '0 24px',
        minHeight: 44,
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--color-border-primary)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-family)',
        transition: 'background 0.1s',
        opacity: isDeclined ? 0.45 : 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Time column */}
      <div
        style={{
          width: 130,
          flexShrink: 0,
          paddingTop: 13,
          paddingRight: 16,
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          whiteSpace: 'nowrap',
        }}
      >
        {timeLabel}
      </div>

      {/* Color bar */}
      <div
        style={{
          width: 3,
          alignSelf: 'stretch',
          minHeight: 44,
          background: color,
          borderRadius: 2,
          flexShrink: 0,
          marginTop: 8,
          marginBottom: 8,
        }}
      />

      {/* Event details */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: '10px 0 10px 12px',
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: isDeclined ? 'line-through' : 'none',
            }}
          >
            {event.summary || '(No title)'}
          </span>
          {event.hangoutLink && (
            <Video
              size={13}
              style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
              aria-label="Video call"
            />
          )}
        </div>

        {/* Location */}
        {event.location && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 3,
            }}
          >
            <MapPin size={11} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {event.location}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
