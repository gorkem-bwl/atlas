import { type ReactElement } from 'react';
import { useCalendarSettingsStore } from '../../stores/calendar-settings-store';
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
  SettingsSelect,
  SelectableCard,
} from '../settings/settings-primitives';

// ---------------------------------------------------------------------------
// Helper: format hour as "9 AM", "12 PM", etc.
// ---------------------------------------------------------------------------

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

// ---------------------------------------------------------------------------
// Panel: General
// ---------------------------------------------------------------------------

export function CalendarGeneralPanel(): ReactElement {
  const {
    weekStartsOnMonday,
    setWeekStartsOnMonday,
    showWeekNumbers,
    setShowWeekNumbers,
    defaultView,
    setDefaultView,
    workStartHour,
    workEndHour,
    setWorkStartHour,
    setWorkEndHour,
    eventReminderMinutes,
    setEventReminderMinutes,
  } = useCalendarSettingsStore();

  const viewOptions: Array<{ value: typeof defaultView; label: string }> = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month-grid', label: 'Month' },
    { value: 'agenda', label: 'Agenda' },
  ];

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: formatHour(i),
  }));

  const reminderOptions: Array<{ value: number; label: string }> = [
    { value: 0, label: 'None' },
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
  ];

  return (
    <div>
      <SettingsSection title="Week" description="Configure how weeks are displayed">
        <SettingsRow label="Week starts on Monday" description="Use Monday as the first day of the week instead of Sunday">
          <SettingsToggle
            checked={weekStartsOnMonday}
            onChange={setWeekStartsOnMonday}
            label="Week starts on Monday"
          />
        </SettingsRow>
        <SettingsRow label="Show week numbers" description="Display ISO week numbers in the calendar">
          <SettingsToggle
            checked={showWeekNumbers}
            onChange={setShowWeekNumbers}
            label="Show week numbers"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Default view" description="Choose which view opens when you navigate to the calendar">
        <SettingsRow label="Default view">
          <SettingsSelect
            value={defaultView}
            options={viewOptions}
            onChange={setDefaultView}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Working hours" description="Highlight your working hours in day and week views">
        <SettingsRow label="Start time">
          <SettingsSelect
            value={workStartHour}
            options={hourOptions}
            onChange={setWorkStartHour}
          />
        </SettingsRow>
        <SettingsRow label="End time">
          <SettingsSelect
            value={workEndHour}
            options={hourOptions}
            onChange={setWorkEndHour}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Notifications" description="Configure event reminder notifications">
        <SettingsRow label="Event reminder" description="How far in advance to show a browser notification">
          <SettingsSelect
            value={eventReminderMinutes}
            options={reminderOptions}
            onChange={setEventReminderMinutes}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Appearance
// ---------------------------------------------------------------------------

export function CalendarAppearancePanel(): ReactElement {
  const {
    density,
    setDensity,
    secondaryTimezone,
    setSecondaryTimezone,
  } = useCalendarSettingsStore();

  const densityOptions: Array<{ id: typeof density; label: string; desc: string }> = [
    { id: 'compact', label: 'Compact', desc: 'Smaller rows, fits more events' },
    { id: 'default', label: 'Default', desc: 'Balanced spacing' },
    { id: 'comfortable', label: 'Comfortable', desc: 'Larger rows, easier to read' },
  ];

  // Common timezone list
  const timezoneOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'None' },
    { value: 'America/New_York', label: 'Eastern (ET)' },
    { value: 'America/Chicago', label: 'Central (CT)' },
    { value: 'America/Denver', label: 'Mountain (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
    { value: 'America/Anchorage', label: 'Alaska (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Shanghai', label: 'China (CST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ];

  return (
    <div>
      <SettingsSection title="Density" description="Control how much space events take up">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
          {densityOptions.map((opt) => (
            <SelectableCard
              key={opt.id}
              selected={density === opt.id}
              onClick={() => setDensity(opt.id)}
              style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: density === opt.id ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                  color: density === opt.id ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                } as React.CSSProperties}
              >
                {opt.label}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                  textAlign: 'center',
                }}
              >
                {opt.desc}
              </span>
            </SelectableCard>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Secondary timezone" description="Show an additional timezone alongside your local time">
        <SettingsRow label="Timezone">
          <SettingsSelect
            value={secondaryTimezone ?? ''}
            options={timezoneOptions}
            onChange={(val) => setSecondaryTimezone(val || null)}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
