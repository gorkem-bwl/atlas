import { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, AlignLeft, Users, Calendar as CalendarIcon, Clock, Trash2, Palette } from 'lucide-react';
import { useCalendarStore } from '../../stores/calendar-store';
import { useCalendars, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from '../../hooks/use-calendar';
import { useSearchContacts } from '../../hooks/use-contacts';
import type { CSSProperties } from 'react';

/** Google Calendar event color IDs mapped to hex values */
const EVENT_COLORS: { id: string; label: string; hex: string }[] = [
  { id: '1', label: 'Lavender', hex: '#7986cb' },
  { id: '2', label: 'Sage', hex: '#33b679' },
  { id: '3', label: 'Grape', hex: '#8e24aa' },
  { id: '4', label: 'Flamingo', hex: '#e67c73' },
  { id: '5', label: 'Banana', hex: '#f6bf26' },
  { id: '6', label: 'Tangerine', hex: '#f4511e' },
  { id: '7', label: 'Peacock', hex: '#039be5' },
  { id: '8', label: 'Graphite', hex: '#616161' },
  { id: '9', label: 'Blueberry', hex: '#3f51b5' },
  { id: '10', label: 'Basil', hex: '#0b8043' },
  { id: '11', label: 'Tomato', hex: '#d50000' },
];

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

interface AttendeeChip {
  email: string;
  name?: string;
}

// ─── Attendee input with autocomplete ──────────────────────────────────

function AttendeeInput({
  attendees,
  onChange,
  inputStyle,
}: {
  attendees: AttendeeChip[];
  onChange: (attendees: AttendeeChip[]) => void;
  inputStyle: CSSProperties;
}) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: contacts } = useSearchContacts(inputValue.trim());

  // Filter out already-added attendees
  const suggestions = (contacts || []).filter(
    (c) => !attendees.some((a) => a.email === c.email),
  );

  const addAttendee = useCallback(
    (email: string, name?: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return;
      if (attendees.some((a) => a.email === trimmed)) return;
      onChange([...attendees, { email: trimmed, name }]);
      setInputValue('');
      setShowSuggestions(false);
      setSelectedIndex(0);
    },
    [attendees, onChange],
  );

  const removeAttendee = useCallback(
    (email: string) => {
      onChange(attendees.filter((a) => a.email !== email));
    },
    [attendees, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !inputValue && attendees.length > 0) {
      removeAttendee(attendees[attendees.length - 1].email);
      return;
    }

    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0 && selectedIndex < suggestions.length) {
        const s = suggestions[selectedIndex];
        addAttendee(s.email, s.name || undefined);
      } else if (inputValue.trim()) {
        addAttendee(inputValue.trim());
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [inputValue]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          ...inputStyle,
          height: 'auto',
          minHeight: 34,
          padding: '4px 6px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'center',
          cursor: 'text',
        }}
      >
        {attendees.map((a) => (
          <span
            key={a.email}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              background: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-primary)',
              maxWidth: 200,
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {a.name || a.email}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeAttendee(a.email);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 14,
                height: 14,
                padding: 0,
                background: 'transparent',
                border: 'none',
                borderRadius: '50%',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (inputValue.trim()) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={attendees.length === 0 ? 'Add attendees...' : ''}
          style={{
            flex: 1,
            minWidth: 100,
            height: 24,
            padding: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
          }}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
            maxHeight: 180,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((contact, i) => (
            <button
              key={contact.email}
              onMouseDown={(e) => {
                e.preventDefault();
                addAttendee(contact.email, contact.name || undefined);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                padding: '6px 10px',
                background: i === selectedIndex ? 'var(--color-bg-hover)' : 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
              }}
            >
              {contact.name && (
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                  {contact.name}
                </span>
              )}
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: contact.name ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                }}
              >
                {contact.email}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Event modal ────────────────────────────────────────────────────────

export function EventModal() {
  const { eventModal, closeEventModal } = useCalendarStore();
  const { data: calendars } = useCalendars();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const [submitError, setSubmitError] = useState('');
  const deleteEvent = useDeleteCalendarEvent();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [calendarId, setCalendarId] = useState('');
  const [attendees, setAttendees] = useState<AttendeeChip[]>([]);
  const [colorId, setColorId] = useState<string | null>(null);
  const [timeError, setTimeError] = useState('');

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
      setAttendees(
        ev.attendees?.map((a) => ({ email: a.email, name: a.displayName })) || [],
      );
      setColorId(ev.colorId || null);
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
      setAttendees([]);
      setColorId(null);
    }
    setTimeError('');
    setSubmitError('');

    // Focus title after render
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [eventModal.open, eventModal.mode, eventModal.event, eventModal.defaultStart, eventModal.defaultEnd, calendars]);

  // Fix: when calendars load after modal opens, set calendarId if still empty
  useEffect(() => {
    if (eventModal.open && eventModal.mode === 'create' && !calendarId && calendars?.length) {
      setCalendarId(calendars.find((c) => c.isPrimary)?.id || calendars[0].id);
    }
  }, [calendars, eventModal.open, eventModal.mode, calendarId]);

  if (!eventModal.open) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;

    // Validate calendarId
    const resolvedCalendarId = calendarId || calendars?.find((c) => c.isPrimary)?.id || calendars?.[0]?.id;
    if (!resolvedCalendarId) return;

    // Validate time range
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (!isAllDay && endDate <= startDate) {
      setTimeError('End time must be after start time');
      return;
    }
    setTimeError('');

    const attendeeList = attendees.map((a) => ({ email: a.email }));

    setSubmitError('');

    if (eventModal.mode === 'create') {
      createEvent.mutate(
        {
          calendarId: resolvedCalendarId,
          summary: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          startTime: toISOString(startTime),
          endTime: toISOString(endTime),
          isAllDay,
          attendees: attendeeList.length > 0 ? attendeeList : undefined,
          colorId: colorId || undefined,
        },
        {
          onSuccess: () => closeEventModal(),
          onError: (err: any) => setSubmitError(err?.response?.data?.error || err?.message || 'Failed to create event'),
        },
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
          colorId: colorId !== undefined ? colorId : undefined,
        },
        {
          onSuccess: () => closeEventModal(),
          onError: (err: any) => setSubmitError(err?.response?.data?.error || err?.message || 'Failed to save event'),
        },
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
    boxSizing: 'border-box' as const,
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
                onChange={(e) => { setStartTime(e.target.value); setTimeError(''); }}
                style={{ ...inputStyle, flex: 1 }}
              />
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>to</span>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? endTime.slice(0, 10) : endTime}
                onChange={(e) => { setEndTime(e.target.value); setTimeError(''); }}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            {timeError && (
              <div style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
                {timeError}
              </div>
            )}
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

          {/* Event color */}
          <div>
            <label style={labelStyle}>
              <Palette size={14} />
              Color
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {/* Calendar default (no color override) */}
              <button
                type="button"
                onClick={() => setColorId(null)}
                title="Calendar default"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: colorId === null ? '2px solid var(--color-text-primary)' : '2px solid var(--color-border-primary)',
                  background: 'linear-gradient(135deg, #ccc 50%, #999 50%)',
                  cursor: 'pointer',
                  padding: 0,
                  boxSizing: 'border-box',
                }}
              />
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorId(c.id)}
                  title={c.label}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: colorId === c.id ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                    background: c.hex,
                    cursor: 'pointer',
                    padding: 0,
                    boxSizing: 'border-box',
                  }}
                />
              ))}
            </div>
          </div>

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
            <AttendeeInput
              attendees={attendees}
              onChange={setAttendees}
              inputStyle={inputStyle}
            />
          </div>
        </div>

        {/* Footer */}
        {submitError && (
          <div style={{ padding: '0 16px 4px', color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>
            {submitError}
          </div>
        )}
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
