import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trash2, Repeat, Check, Video } from 'lucide-react';
import type { RecurringEditScope } from '@atlasmail/shared';
import { useCalendarStore } from '../../stores/calendar-store';
import { useCalendars, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from '../../hooks/use-calendar';
import { SchedulingAssistant } from './scheduling-assistant';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { IconButton } from '../ui/icon-button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
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

const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DOW_VALUES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

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

function buildRRule(
  recurrenceFreq: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
  recurrenceInterval: number,
  recurrenceByDay: string[],
  recurrenceEnd: 'never' | 'count' | 'until',
  recurrenceCount: number,
  recurrenceUntil: string,
): string[] {
  if (recurrenceFreq === 'none') return [];
  let rule = `RRULE:FREQ=${recurrenceFreq.toUpperCase()}`;
  if (recurrenceInterval > 1) rule += `;INTERVAL=${recurrenceInterval}`;
  if (recurrenceFreq === 'weekly' && recurrenceByDay.length > 0) {
    rule += `;BYDAY=${recurrenceByDay.join(',')}`;
  }
  if (recurrenceEnd === 'count') rule += `;COUNT=${recurrenceCount}`;
  else if (recurrenceEnd === 'until' && recurrenceUntil)
    rule += `;UNTIL=${recurrenceUntil.replace(/-/g, '')}T235959Z`;
  return [rule];
}

function parseRRule(rule: string): {
  freq: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  byDay: string[];
  end: 'never' | 'count' | 'until';
  count: number;
  until: string;
} {
  const result = { freq: 'none' as const, interval: 1, byDay: [] as string[], end: 'never' as const, count: 10, until: '' };
  const body = rule.replace('RRULE:', '');
  const parts = body.split(';');
  const get = (key: string) => parts.find((p) => p.startsWith(`${key}=`))?.split('=')[1] ?? '';

  const freqRaw = get('FREQ').toLowerCase();
  if (['daily', 'weekly', 'monthly', 'yearly'].includes(freqRaw)) {
    (result as any).freq = freqRaw;
  }
  const interval = parseInt(get('INTERVAL'), 10);
  if (!isNaN(interval) && interval > 0) result.interval = interval;

  const byday = get('BYDAY');
  if (byday) result.byDay = byday.split(',');

  const count = parseInt(get('COUNT'), 10);
  if (!isNaN(count)) {
    (result as any).end = 'count';
    result.count = count;
  }
  const until = get('UNTIL');
  if (until) {
    (result as any).end = 'until';
    // Convert YYYYMMDDTHHMMSSZ → YYYY-MM-DD
    const y = until.slice(0, 4);
    const mo = until.slice(4, 6);
    const d = until.slice(6, 8);
    result.until = `${y}-${mo}-${d}`;
  }

  return result;
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
  const inputRef = useRef<HTMLInputElement>(null);

  const addAttendee = useCallback(
    (email: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return;
      if (attendees.some((a) => a.email === trimmed)) return;
      onChange([...attendees, { email: trimmed }]);
      setInputValue('');
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
      if (inputValue.trim()) {
        addAttendee(inputValue.trim());
      }
      return;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
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
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attendees.length === 0 ? 'Add attendees (email, press Enter)...' : ''}
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
  const [recurringPrompt, setRecurringPrompt] = useState<'save' | 'delete' | null>(null);

  // Feature 1: Recurrence
  const [recurrenceFreq, setRecurrenceFreq] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceByDay, setRecurrenceByDay] = useState<string[]>([]);
  const [recurrenceEnd, setRecurrenceEnd] = useState<'never' | 'count' | 'until'>('never');
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [recurrenceUntil, setRecurrenceUntil] = useState('');

  // Feature 6: Free/busy transparency
  const [transparency, setTransparency] = useState<'opaque' | 'transparent'>('opaque');

  // Feature 7: Reminders
  const [useDefaultReminders, setUseDefaultReminders] = useState(true);
  const [reminderOverrides, setReminderOverrides] = useState<Array<{ method: string; minutes: number }>>([]);

  // Populate form on open — keyed on modal identity, NOT on calendars
  const modalKey = eventModal.open
    ? `${eventModal.mode}-${eventModal.event?.id ?? 'new'}-${eventModal.defaultStart}-${eventModal.defaultEnd}`
    : '';

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
      setTransparency(ev.transparency || 'opaque');

      // Reminders
      if (ev.reminders) {
        setUseDefaultReminders(ev.reminders.useDefault);
        setReminderOverrides(ev.reminders.overrides || []);
      } else {
        setUseDefaultReminders(true);
        setReminderOverrides([]);
      }

      // Recurrence
      if (ev.recurrence?.length) {
        const ruleStr = ev.recurrence.find((r) => r.startsWith('RRULE:')) || '';
        if (ruleStr) {
          const parsed = parseRRule(ruleStr);
          setRecurrenceFreq(parsed.freq);
          setRecurrenceInterval(parsed.interval);
          setRecurrenceByDay(parsed.byDay);
          setRecurrenceEnd(parsed.end);
          setRecurrenceCount(parsed.count);
          setRecurrenceUntil(parsed.until);
        } else {
          setRecurrenceFreq('none');
          setRecurrenceInterval(1);
          setRecurrenceByDay([]);
          setRecurrenceEnd('never');
          setRecurrenceCount(10);
          setRecurrenceUntil('');
        }
      } else {
        setRecurrenceFreq('none');
        setRecurrenceInterval(1);
        setRecurrenceByDay([]);
        setRecurrenceEnd('never');
        setRecurrenceCount(10);
        setRecurrenceUntil('');
      }
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
      setIsAllDay(eventModal.defaultIsAllDay ?? false);
      setCalendarId(''); // Will be filled by the calendar-loader effect below
      setAttendees([]);
      setColorId(null);
      setTransparency('opaque');
      setUseDefaultReminders(true);
      setReminderOverrides([]);
      setRecurrenceFreq('none');
      setRecurrenceInterval(1);
      setRecurrenceByDay([]);
      setRecurrenceEnd('never');
      setRecurrenceCount(10);
      setRecurrenceUntil('');

      // Prefill (Feature 4)
      if (eventModal.prefill) {
        setTitle(eventModal.prefill.summary || '');
        setDescription(eventModal.prefill.description || '');
        setAttendees(eventModal.prefill.attendees?.map((a) => ({ email: a.email, name: a.name })) || []);
      }
    }
    setTimeError('');
    setSubmitError('');
    setRecurringPrompt(null);

    // Focus title after render
    setTimeout(() => titleRef.current?.focus(), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalKey]);

  // Set calendarId once calendars are available (or when modal opens)
  useEffect(() => {
    if (eventModal.open && eventModal.mode === 'create' && !calendarId && calendars?.length) {
      setCalendarId(calendars.find((c) => c.isPrimary)?.id || calendars[0].id);
    }
  }, [calendars, eventModal.open, eventModal.mode, calendarId]);

  if (!eventModal.open) return null;

  const isRecurring = !!(eventModal.mode === 'edit' && eventModal.event?.recurringEventId);

  const doSubmit = (scope?: RecurringEditScope) => {
    if (!title.trim()) return;

    const resolvedCalendarId = calendarId || calendars?.find((c) => c.isPrimary)?.id || calendars?.[0]?.id;
    if (!resolvedCalendarId) return;

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (!isAllDay && endDate <= startDate) {
      setTimeError('End time must be after start time');
      return;
    }
    setTimeError('');

    const attendeeList = attendees.map((a) => ({ email: a.email }));
    setSubmitError('');

    const rrule = buildRRule(recurrenceFreq, recurrenceInterval, recurrenceByDay, recurrenceEnd, recurrenceCount, recurrenceUntil);
    const remindersPayload = {
      useDefault: useDefaultReminders,
      overrides: useDefaultReminders ? undefined : reminderOverrides,
    };

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
          recurrence: rrule.length > 0 ? rrule : undefined,
          transparency,
          reminders: remindersPayload,
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
          recurringEditScope: scope,
          transparency,
          reminders: remindersPayload,
          ...(calendarId !== eventModal.event.calendarId && { calendarId }),
        },
        {
          onSuccess: () => closeEventModal(),
          onError: (err: any) => setSubmitError(err?.response?.data?.error || err?.message || 'Failed to save event'),
        },
      );
    }
  };

  const handleSubmit = () => {
    if (isRecurring && !recurringPrompt) {
      setRecurringPrompt('save');
      return;
    }
    doSubmit();
  };

  const doDelete = (scope?: 'single' | 'all') => {
    if (eventModal.event) {
      deleteEvent.mutate(
        { eventId: eventModal.event.id, scope },
        { onSuccess: () => closeEventModal() },
      );
    }
  };

  const handleDelete = () => {
    if (isRecurring && !recurringPrompt) {
      setRecurringPrompt('delete');
      return;
    }
    doDelete();
  };

  // Feature 2: RSVP handler
  const handleRSVP = (status: 'accepted' | 'tentative' | 'declined') => {
    if (!eventModal.event) return;
    updateEvent.mutate(
      { eventId: eventModal.event.id, responseStatus: status },
      {
        onSuccess: () => closeEventModal(),
        onError: (err: any) => setSubmitError(err?.response?.data?.error || err?.message || 'Failed to update response'),
      },
    );
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

  const currentResponseStatus = eventModal.event?.selfResponseStatus;
  const isOrganizer = eventModal.event?.organizer?.self === true;
  const showRSVP = eventModal.mode === 'edit' && currentResponseStatus && !isOrganizer;

  return (
    <Modal
      open={eventModal.open}
      onOpenChange={(open) => { if (!open) closeEventModal(); }}
      width={460}
      title={eventModal.mode === 'create' ? 'New event' : 'Edit event'}
      contentStyle={{ maxHeight: 'calc(100vh - 64px)' }}
    >
        {/* Header */}
        <Modal.Header title={eventModal.mode === 'create' ? 'New event' : 'Edit event'}>
            {isRecurring && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  background: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-accent-primary)',
                  fontWeight: 500,
                }}
              >
                <Repeat size={10} />
                Recurring
              </span>
            )}
            {/* Feature 5: Join meeting button in header */}
            {eventModal.mode === 'edit' && eventModal.event?.hangoutLink && (
              <a
                href={eventModal.event.hangoutLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  background: '#1a73e8',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Video size={11} />
                Join
              </a>
            )}
        </Modal.Header>

        {/* Body */}
        <Modal.Body padding="16px">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Title */}
          <div>
            <Input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              size="lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) handleSubmit();
                if (e.key === 'Escape') closeEventModal();
              }}
              style={{
                fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
              }}
            />
          </div>

          {/* Date/time row */}
          <div>
            <label style={labelStyle}>
              Date &amp; time
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? startTime.slice(0, 10) : startTime}
                onChange={(e) => { setStartTime(e.target.value); setTimeError(''); }}
                size="sm"
                style={{ flex: 1 }}
              />
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>to</span>
              <Input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? endTime.slice(0, 10) : endTime}
                onChange={(e) => { setEndTime(e.target.value); setTimeError(''); }}
                size="sm"
                style={{ flex: 1 }}
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

          {/* Feature 1: Repeat / Recurrence rule builder */}
          <div>
            <label style={labelStyle}>
              Repeat
            </label>
            <Select
              value={recurrenceFreq}
              onChange={(val) => setRecurrenceFreq(val as typeof recurrenceFreq)}
              size="sm"
              options={[
                { value: 'none', label: 'None' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />

            {recurrenceFreq !== 'none' && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Every N frequency */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  <span>Every</span>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={String(recurrenceInterval)}
                    onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    size="sm"
                    style={{ width: 60, textAlign: 'center' }}
                  />
                  <span>{recurrenceFreq === 'daily' ? 'day(s)' : recurrenceFreq === 'weekly' ? 'week(s)' : recurrenceFreq === 'monthly' ? 'month(s)' : 'year(s)'}</span>
                </div>

                {/* Day-of-week toggles for weekly */}
                {recurrenceFreq === 'weekly' && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {DOW_LABELS.map((label, i) => {
                      const val = DOW_VALUES[i];
                      const active = recurrenceByDay.includes(val);
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setRecurrenceByDay((prev) =>
                              active ? prev.filter((d) => d !== val) : [...prev, val],
                            );
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            border: active ? 'none' : '1px solid var(--color-border-primary)',
                            background: active ? 'var(--color-accent-primary)' : 'transparent',
                            color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                            fontSize: 11,
                            fontFamily: 'var(--font-family)',
                            fontWeight: active ? 600 : 400,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            transition: 'background 150ms, color 150ms',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* End condition */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End</span>
                  {(['never', 'count', 'until'] as const).map((endOption) => (
                    <label
                      key={endOption}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                    >
                      <input
                        type="radio"
                        name="recurrence-end"
                        value={endOption}
                        checked={recurrenceEnd === endOption}
                        onChange={() => setRecurrenceEnd(endOption)}
                        style={{ accentColor: 'var(--color-accent-primary)' }}
                      />
                      {endOption === 'never' && 'Never'}
                      {endOption === 'count' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          After
                          <Input
                            type="number"
                            min={1}
                            max={999}
                            value={String(recurrenceCount)}
                            onChange={(e) => setRecurrenceCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            disabled={recurrenceEnd !== 'count'}
                            size="sm"
                            style={{ width: 60, textAlign: 'center', opacity: recurrenceEnd !== 'count' ? 0.4 : 1 }}
                          />
                          occurrences
                        </span>
                      )}
                      {endOption === 'until' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          On
                          <Input
                            type="date"
                            value={recurrenceUntil}
                            onChange={(e) => setRecurrenceUntil(e.target.value)}
                            disabled={recurrenceEnd !== 'until'}
                            size="sm"
                            style={{ width: 'auto', opacity: recurrenceEnd !== 'until' ? 0.4 : 1 }}
                          />
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Calendar selector */}
          {calendars && calendars.length > 1 && (
            <div>
              <label style={labelStyle}>
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

          {/* Feature 6: Show as (free/busy) */}
          <div>
            <label style={labelStyle}>
              Show as
            </label>
            <select
              value={transparency}
              onChange={(e) => setTransparency(e.target.value as 'opaque' | 'transparent')}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}
            >
              <option value="opaque">Busy</option>
              <option value="transparent">Free</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label style={labelStyle}>
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
              Attendees
            </label>
            <AttendeeInput
              attendees={attendees}
              onChange={setAttendees}
              inputStyle={inputStyle}
            />
          </div>

          {/* Scheduling assistant — visible when there are attendees */}
          {attendees.length > 0 && (
            <SchedulingAssistant
              attendees={attendees}
              startTime={toISOString(startTime)}
              endTime={toISOString(endTime)}
            />
          )}

          {/* Feature 2: RSVP buttons */}
          {showRSVP && (
            <div>
              <label style={labelStyle}>
                <Check size={14} />
                Your response
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['accepted', 'tentative', 'declined'] as const).map((status) => {
                  const isActive = currentResponseStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleRSVP(status)}
                      disabled={isPending}
                      style={{
                        height: 30,
                        padding: '0 12px',
                        background: isActive ? 'var(--color-accent-primary)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--color-accent-primary)' : 'var(--color-border-primary)'}`,
                        borderRadius: 'var(--radius-sm)',
                        color: isActive ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-xs)',
                        fontFamily: 'var(--font-family)',
                        fontWeight: isActive ? 600 : 400,
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        opacity: isPending ? 0.5 : 1,
                        transition: 'background 150ms, color 150ms, border-color 150ms',
                      }}
                    >
                      {status === 'accepted' ? 'Accept' : status === 'tentative' ? 'Maybe' : 'Decline'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feature 7: Reminders */}
          <div>
            <label style={labelStyle}>
              Reminders
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                marginBottom: 6,
              }}
            >
              <input
                type="checkbox"
                checked={useDefaultReminders}
                onChange={(e) => setUseDefaultReminders(e.target.checked)}
                style={{ accentColor: 'var(--color-accent-primary)' }}
              />
              Use default reminders
            </label>
            {!useDefaultReminders && (
              <>
                {reminderOverrides.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <input
                      type="number"
                      min={0}
                      value={r.minutes}
                      onChange={(e) => {
                        const updated = [...reminderOverrides];
                        updated[i] = { ...updated[i], minutes: Math.max(0, parseInt(e.target.value, 10) || 0) };
                        setReminderOverrides(updated);
                      }}
                      style={{ ...inputStyle, width: 60, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>minutes before</span>
                    <button
                      onClick={() => setReminderOverrides(reminderOverrides.filter((_, idx) => idx !== i))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text-tertiary)',
                        cursor: 'pointer',
                        fontSize: 16,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setReminderOverrides([...reminderOverrides, { method: 'popup', minutes: 10 }])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-accent-primary)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-family)',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  + Add reminder
                </button>
              </>
            )}
          </div>
        </div>
        </Modal.Body>

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
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="danger"
                size="md"
                icon={<Trash2 size={14} />}
                onClick={handleDelete}
                disabled={isPending}
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                Delete
              </Button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              size="md"
              onClick={closeEventModal}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={!title.trim() || isPending}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {eventModal.mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Recurring event scope prompt */}
        {recurringPrompt && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              gap: 16,
              zIndex: 10,
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                textAlign: 'center',
              }}
            >
              {recurringPrompt === 'delete' ? 'Delete recurring event' : 'Edit recurring event'}
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
              }}
            >
              This event is part of a series. What would you like to {recurringPrompt === 'delete' ? 'delete' : 'edit'}?
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 260 }}>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setRecurringPrompt(null);
                  if (recurringPrompt === 'delete') doDelete('single');
                  else doSubmit('single');
                }}
                disabled={isPending}
                style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}
              >
                This event only
              </Button>
              {recurringPrompt !== 'delete' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setRecurringPrompt(null);
                    doSubmit('thisAndFollowing');
                  }}
                  disabled={isPending}
                  style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}
                >
                  This and following events
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setRecurringPrompt(null);
                  if (recurringPrompt === 'delete') doDelete('all');
                  else doSubmit('all');
                }}
                disabled={isPending}
                style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}
              >
                All events in the series
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setRecurringPrompt(null)}
                style={{ width: '100%', borderRadius: 'var(--radius-sm)', marginTop: 4 }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
    </Modal>
  );
}
