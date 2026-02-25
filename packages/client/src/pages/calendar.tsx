import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react';
import { createViewWeek, createViewMonthGrid, createViewDay, toJSDate } from '@schedule-x/calendar';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import '@schedule-x/theme-default/dist/calendar.css';
import '../styles/calendar.css';
import { useCalendars, useCalendarEvents, useSyncCalendar, useToggleCalendar } from '../hooks/use-calendar';
import { useCalendarStore } from '../stores/calendar-store';
import { EventModal } from '../components/calendar/event-modal';
import type { CalendarEvent as AtlasCalendarEvent } from '@atlasmail/shared';
import type { CSSProperties } from 'react';

/** Convert our DB events to Schedule-X event format */
function toScheduleXEvents(
  events: AtlasCalendarEvent[],
  selectedCalendarIds: Set<string>,
  calendarColorMap: Map<string, string>,
) {
  return events
    .filter((ev) => selectedCalendarIds.has(ev.calendarId))
    .map((ev) => ({
      id: ev.id,
      start: ev.startTime,
      end: ev.endTime,
      title: ev.summary || '(No title)',
      location: ev.location || undefined,
      description: ev.description || undefined,
      calendarId: ev.calendarId,
    }));
}

function getTimeRange(selectedDate: string) {
  const d = new Date(selectedDate);
  const start = new Date(d);
  start.setMonth(start.getMonth() - 1);
  const end = new Date(d);
  end.setMonth(end.getMonth() + 2);
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}

export function CalendarPage() {
  const navigate = useNavigate();
  const {
    selectedDate,
    setSelectedDate,
    openCreateModal,
    openEditModal,
  } = useCalendarStore();

  const [currentTimeRange, setCurrentTimeRange] = useState(() => getTimeRange(selectedDate));
  const { data: calendars } = useCalendars();
  const { data: events } = useCalendarEvents(currentTimeRange.timeMin, currentTimeRange.timeMax);
  const syncCalendar = useSyncCalendar();

  // Derive selected calendar IDs and color map
  const selectedCalendarIds = useMemo(() => {
    if (!calendars) return new Set<string>();
    return new Set(calendars.filter((c) => c.isSelected).map((c) => c.id));
  }, [calendars]);

  const calendarColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (calendars) {
      for (const c of calendars) {
        map.set(c.id, c.backgroundColor || 'var(--color-accent-primary)');
      }
    }
    return map;
  }, [calendars]);

  // Events service plugin for programmatic event management
  const eventsService = useMemo(() => createEventsServicePlugin(), []);

  const calendarApp = useCalendarApp(
    {
      defaultView: 'week',
      views: [createViewWeek(), createViewMonthGrid(), createViewDay()],
      selectedDate: selectedDate,
      events: [],
      callbacks: {
        onEventClick: (event) => {
          const dbEvent = events?.find((e) => e.id === event.id);
          if (dbEvent) openEditModal(dbEvent);
        },
        onDoubleClickDateTime: (dateTime) => {
          const jsDate = toJSDate(dateTime.toString());
          const endDate = new Date(jsDate.getTime() + 60 * 60 * 1000);
          openCreateModal(jsDate.toISOString(), endDate.toISOString());
        },
        onDoubleClickDate: (date) => {
          const jsDate = toJSDate(date.toString());
          const endDate = new Date(jsDate.getTime() + 24 * 60 * 60 * 1000);
          openCreateModal(jsDate.toISOString(), endDate.toISOString());
        },
        onRangeUpdate: (range) => {
          const start = toJSDate(range.start.toString());
          const end = toJSDate(range.end.toString());
          const midpoint = new Date((start.getTime() + end.getTime()) / 2);
          const dateStr = midpoint.toISOString().slice(0, 10);
          setSelectedDate(dateStr);
          // Expand fetch range around the visible range
          const fetchStart = new Date(start);
          fetchStart.setDate(fetchStart.getDate() - 7);
          const fetchEnd = new Date(end);
          fetchEnd.setDate(fetchEnd.getDate() + 7);
          setCurrentTimeRange({
            timeMin: fetchStart.toISOString(),
            timeMax: fetchEnd.toISOString(),
          });
        },
      },
      dayBoundaries: {
        start: '06:00',
        end: '22:00',
      },
    },
    [eventsService],
  );

  // Sync events to Schedule-X whenever data changes
  useEffect(() => {
    if (!calendarApp || !events) return;
    const sxEvents = toScheduleXEvents(events, selectedCalendarIds, calendarColorMap);
    try {
      eventsService.set(sxEvents as any);
    } catch {
      // eventsService may not be ready yet
    }
  }, [calendarApp, events, selectedCalendarIds, calendarColorMap, eventsService]);

  // Initial sync on mount
  useEffect(() => {
    syncCalendar.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isDesktop = !!('atlasDesktop' in window);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-family)',
        overflow: 'hidden',
      }}
    >
      {/* Top toolbar */}
      <div
        className={isDesktop ? 'desktop-drag-region' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          padding: '8px 16px',
          paddingTop: isDesktop ? 40 : 8,
          borderBottom: '1px solid var(--color-border-primary)',
          background: 'var(--color-bg-secondary)',
          flexShrink: 0,
        }}
      >
        {/* Back to inbox */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            padding: 0,
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
          title="Back to inbox"
        >
          <ArrowLeft size={18} />
        </button>

        <span
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
          }}
        >
          Calendar
        </span>

        <div style={{ flex: 1 }} />

        {/* Calendar list toggles */}
        {calendars && calendars.length > 0 && (
          <CalendarListInline calendars={calendars} />
        )}

        {/* Sync button */}
        <button
          onClick={() => syncCalendar.mutate()}
          disabled={syncCalendar.isPending}
          title="Sync calendar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            padding: 0,
            background: 'transparent',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-secondary)',
            cursor: syncCalendar.isPending ? 'not-allowed' : 'pointer',
            opacity: syncCalendar.isPending ? 0.5 : 1,
          }}
        >
          <RefreshCw
            size={14}
            style={{
              animation: syncCalendar.isPending ? 'spin 1s linear infinite' : undefined,
            }}
          />
        </button>

        {/* Create event button */}
        <button
          onClick={() => openCreateModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 30,
            padding: '0 12px',
            background: 'var(--color-accent-primary)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-inverse)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
            fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          New event
        </button>
      </div>

      {/* Calendar body — Schedule-X renders its own header with navigation + view switcher */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
        className="atlasmail-calendar-wrapper"
      >
        {calendarApp && <ScheduleXCalendar calendarApp={calendarApp} />}
      </div>

      {/* Event modal */}
      <EventModal />

      {/* Spin animation for sync button */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/** Inline calendar list shown in the toolbar */
function CalendarListInline({
  calendars,
}: {
  calendars: Array<{
    id: string;
    summary: string | null;
    backgroundColor: string | null;
    isSelected: boolean;
    googleCalendarId: string;
  }>;
}) {
  const toggle = useToggleCalendar();

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginRight: 8 }}>
      {calendars.map((cal) => (
        <button
          key={cal.id}
          onClick={() => toggle.mutate({ calendarId: cal.id, isSelected: !cal.isSelected })}
          title={cal.summary || cal.googleCalendarId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            height: 26,
            padding: '0 8px',
            background: cal.isSelected
              ? `color-mix(in srgb, ${cal.backgroundColor || 'var(--color-accent-primary)'} 15%, transparent)`
              : 'transparent',
            border: `1px solid ${cal.isSelected ? (cal.backgroundColor || 'var(--color-accent-primary)') : 'var(--color-border-primary)'}`,
            borderRadius: 'var(--radius-sm)',
            color: cal.isSelected
              ? (cal.backgroundColor || 'var(--color-accent-primary)')
              : 'var(--color-text-tertiary)',
            fontSize: 'var(--font-size-xs)',
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            opacity: cal.isSelected ? 1 : 0.6,
            transition: 'opacity var(--transition-fast), background var(--transition-fast)',
            whiteSpace: 'nowrap',
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: cal.backgroundColor || 'var(--color-accent-primary)',
              flexShrink: 0,
            }}
          />
          {cal.summary || 'Calendar'}
        </button>
      ))}
    </div>
  );
}
