import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settings-store';
import {
  SettingsSection,
  SettingsRow,
  SettingsSelect,
} from './settings-primitives';

// ---------------------------------------------------------------------------
// Timezone helpers
// ---------------------------------------------------------------------------

function getTimezoneOptions(): Array<{ value: string; label: string }> {
  try {
    const zones = Intl.supportedValuesOf('timeZone');
    return zones.map((tz) => {
      // Show the full IANA name as the label (e.g. "America/New_York")
      return { value: tz, label: tz.replace(/_/g, ' ') };
    });
  } catch {
    // Fallback for older browsers that don't support supportedValuesOf
    const fallback = [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Sao_Paulo',
      'Europe/London',
      'Europe/Berlin',
      'Europe/Paris',
      'Europe/Istanbul',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Australia/Sydney',
      'Pacific/Auckland',
    ];
    return fallback.map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }));
  }
}

// ---------------------------------------------------------------------------
// FormatsPanel
// ---------------------------------------------------------------------------

export function FormatsPanel() {
  const { t } = useTranslation();
  const {
    dateFormat,
    timeFormat,
    timezone,
    numberFormat,
    currencySymbol,
    calendarStartDay,
    setDateFormat,
    setTimeFormat,
    setTimezone,
    setNumberFormat,
    setCurrencySymbol,
    setCalendarStartDay,
  } = useSettingsStore();

  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

  return (
    <div>
      {/* ── Date & time ─────────────────────────────────────────────── */}
      <SettingsSection title={t('settings.dateAndTime')}>
        <SettingsRow label={t('settings.dateFormat')} description={t('settings.dateFormatDesc')}>
          <SettingsSelect
            value={dateFormat}
            options={[
              { value: 'MM/DD/YYYY' as const, label: 'MM/DD/YYYY' },
              { value: 'DD/MM/YYYY' as const, label: 'DD/MM/YYYY' },
              { value: 'YYYY-MM-DD' as const, label: 'YYYY-MM-DD' },
            ]}
            onChange={setDateFormat}
          />
        </SettingsRow>

        <SettingsRow label={t('settings.timeFormat')} description={t('settings.timeFormatDesc')}>
          <SettingsSelect
            value={timeFormat}
            options={[
              { value: '12h' as const, label: t('settings.12hour') },
              { value: '24h' as const, label: t('settings.24hour') },
            ]}
            onChange={setTimeFormat}
          />
        </SettingsRow>

        <SettingsRow label={t('settings.timezone')} description={t('settings.timezoneDesc')}>
          <SettingsSelect
            value={timezone}
            options={timezoneOptions}
            onChange={setTimezone}
          />
        </SettingsRow>
      </SettingsSection>

      {/* ── Numbers & currency ──────────────────────────────────────── */}
      <SettingsSection title={t('settings.numbersAndCurrency')}>
        <SettingsRow label={t('settings.numberFormat')} description={t('settings.numberFormatDesc')}>
          <SettingsSelect
            value={numberFormat}
            options={[
              { value: 'comma-period' as const, label: '1,234.56' },
              { value: 'period-comma' as const, label: '1.234,56' },
              { value: 'space-comma' as const, label: '1 234,56' },
            ]}
            onChange={setNumberFormat}
          />
        </SettingsRow>

        <SettingsRow label={t('settings.currencyLabel')} description={t('settings.currencyDesc')}>
          <SettingsSelect
            value={currencySymbol}
            options={[
              { value: '$', label: '$ USD' },
              { value: '€', label: '€ EUR' },
              { value: '£', label: '£ GBP' },
              { value: '¥', label: '¥ JPY' },
              { value: '₺', label: '₺ TRY' },
              { value: '₹', label: '₹ INR' },
              { value: '₩', label: '₩ KRW' },
              { value: 'R$', label: 'R$ BRL' },
              { value: 'CHF', label: 'CHF' },
              { value: 'kr', label: 'kr SEK' },
            ]}
            onChange={setCurrencySymbol}
          />
        </SettingsRow>
      </SettingsSection>

      {/* ── Calendar ────────────────────────────────────────────────── */}
      <SettingsSection title={t('settings.calendarSection')}>
        <SettingsRow label={t('settings.weekStartsOn')} description={t('settings.weekStartsOnDesc')}>
          <SettingsSelect
            value={calendarStartDay}
            options={[
              { value: 'sunday' as const, label: t('settings.sunday') },
              { value: 'monday' as const, label: t('settings.monday') },
            ]}
            onChange={setCalendarStartDay}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
