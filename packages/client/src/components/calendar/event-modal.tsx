import { useState, useEffect, useRef } from 'react';
import { X, MapPin, AlignLeft, Users, Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react';
import { useCalendarStore } from '../../stores/calendar-store';
import { useCalendars, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from '../../hooks/use-calendar';
import type { CSSProperties } from 'react';

function formatDateTimeLocal(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISOString(dateTimeLocal: string): string {
  if (!dateTimeLocal) return new Date().toISOString();
  return new Date(dateTimeLocal).toISOString();
}

export function EventModal() {
  const { eventModal, closeEventModal } = useCalendarStore();
  const { data: calendars } = useCalendars();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [calendarId, setCalendarId] = useState('');
  const [attendees, setAttendees] = useState('');

  // Populate form on open
  useEffect(() => {
    if (!eventModal.open) return;

    if (eventModal.mode === 'edit' && eventModal.event) {
      const ev = eventModal.event;
      setTitle(ev.summary || '');
      setDescription(ev.description || '');
      setLocation(ev.location || '');
      setStartTime(formatDateTimeLocal(ev.startTime));
      setEndTime(formatDateTimeLocal(ev.endTime));
      setIsAllDay(ev.isAllDay);
      setCalendarId(ev.calendarId);
      setAttendees(ev.attendees?.map((a) => a.email).join(', ') || '');
    } else {
      // Create mode
      const now = new Date();
      const defaultStart = eventModal.defaultStart || now.toISOString();
      const defaultEnd =
        eventModal.defaultEnd ||
        new Date(new Date(defaultStart).getTime() + 60 * 60 * 1000).toISOString();
      setTitle('');
      setDescription('');
      setLocation('');
      setStartTime(formatDateTimeLocal(defaultStart));
      setEndTime(formatDateTimeLocal(defaultEnd));
      setIsAllDay(false);
      setCalendarId(calendars?.find((c) => c.isPrimary)?.id || calendars?.[0]?.id || '');
      setAttendees('');
    }

    // Focus title after render
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [eventModal.open, eventModal.mode, eventModal.event, eventModal.defaultStart, eventModal.defaultEnd, calendars]);

  if (!eventModal.open) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;

    const attendeeList = attendees
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
      .map((email) => ({ email }));

    if (eventModal.mode === 'create') {
      createEvent.mutate(
        {
          calendarId,
          summary: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          startTime: toISOString(startTime),
          endTime: toISOString(endTime),
          isAllDay,
          attendees: attendeeList.length > 0 ? attendeeList : undefined,
        },
        { onSuccess: () => closeEventModal() },
      );
    } else if (eventModal.event) {
      updateEvent.mutate(
        {
          eventId: eventModal.event.id,
          summary: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          startTime: toISOString(startTime),
          endTime: toISOString(endTime),
          isAllDay,
          attendees: attendeeList.length > 0 ? attendeeList : undefined,
        },
        { onSuccess: () => closeEventModal() },
      );
    }
  };

  const handleDelete = () => {
    if (eventModal.event) {
      deleteEvent.mutate(eventModal.event.id, {
        onSuccess: () => closeEventModal(),
      });
    }
  };

  const isPending = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  const inputStyle: CSSProperties = {
    width: '100%',
    height: 34,
    padding: '0 10px',
    border: '1px solid var(--color-border-primary)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    fontFamily: 'var(--font-family)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
    marginBottom: 4,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeEventModal}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--color-bg-overlay)',
          zIndex: 200,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 460,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-elevated)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'var(--font-family)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--color-border-primary)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
              color: 'var(--color-text-primary)',
            }}
          >
            {eventModal.mode === 'create' ? 'New event' : 'Edit event'}
          </span>
          <button
            onClick={closeEventModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              padding: 0,
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Title */}
          <div>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) handleSubmit();
                if (e.key === 'Escape') closeEventModal();
              }}
              style={{
                ...inputStyle,
                height: 40,
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
              }}
            />
          </div>

          {/* Date/time row */}
          <div>
            <label style={labelStyle}>
              <Clock size={14} />
              Date &amp; time
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? startTime.slice(0, 10) : startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>to</span>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? endTime.slice(0, 10) : endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                style={{ accentColor: 'var(--color-accent-primary)' }}
              />
              All day
            </label>
          </div>

          {/* Calendar selector */}
          {calendars && calendars.length > 1 && (
            <div>
              <label style={labelStyle}>
                <CalendarIcon size={14} />
                Calendar
              </label>
              <select
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  appearance: 'auto',
                }}
              >
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary || c.googleCalendarId}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location */}
          <div>
            <label style={labelStyle}>
              <MapPin size={14} />
              Location
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>
              <AlignLeft size={14} />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
              rows={3}
              style={{
                ...inputStyle,
                height: 'auto',
                padding: '8px 10px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Attendees */}
          <div>
            <label style={labelStyle}>
              <Users size={14} />
              Attendees
            </label>
            <input
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="email@example.com, ..."
              style={inputStyle}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: eventModal.mode === 'edit' ? 'space-between' : 'flex-end',
            gap: 8,
            padding: '12px 16px',
            borderTop: '1px solid var(--color-border-primary)',
          }}
        >
          {eventModal.mode === 'edit' && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 34,
                padding: '0 12px',
                background: 'transparent',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-error)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1,
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={closeEventModal}
              style={{
                height: 34,
                padding: '0 16px',
                background: 'transparent',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isPending}
              style={{
                height: 34,
                padding: '0 16px',
                background: 'var(--color-accent-primary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-inverse)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
                cursor: !title.trim() || isPending ? 'not-allowed' : 'pointer',
                opacity: !title.trim() || isPending ? 0.5 : 1,
              }}
            >
              {eventModal.mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
