import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';

export type CalendarView = 'week' | 'month-grid' | 'day' | 'agenda' | 'year';
export type CalendarDensity = 'compact' | 'default' | 'comfortable';

interface CalendarSettings {
  defaultView: CalendarView;
  weekStartsOnMonday: boolean;
  showWeekNumbers: boolean;
  density: CalendarDensity;
  workStartHour: number;
  workEndHour: number;
  secondaryTimezone: string | null;
  eventReminderMinutes: number;
}

const DEFAULTS: CalendarSettings = {
  defaultView: 'week',
  weekStartsOnMonday: false,
  showWeekNumbers: false,
  density: 'default',
  workStartHour: 9,
  workEndHour: 17,
  secondaryTimezone: null,
  eventReminderMinutes: 10,
};

const TO_SERVER: Record<keyof CalendarSettings, string> = {
  defaultView: 'calDefaultView',
  weekStartsOnMonday: 'calWeekStartsOnMonday',
  showWeekNumbers: 'calShowWeekNumbers',
  density: 'calDensity',
  workStartHour: 'calWorkStartHour',
  workEndHour: 'calWorkEndHour',
  secondaryTimezone: 'calSecondaryTimezone',
  eventReminderMinutes: 'calEventReminderMinutes',
};

const FROM_SERVER: Record<string, keyof CalendarSettings> = Object.fromEntries(
  Object.entries(TO_SERVER).map(([local, server]) => [server, local as keyof CalendarSettings])
) as Record<string, keyof CalendarSettings>;

function parseServerSettings(data: Record<string, unknown> | null): CalendarSettings {
  if (!data) return { ...DEFAULTS };
  const result = { ...DEFAULTS };
  for (const [serverKey, localKey] of Object.entries(FROM_SERVER)) {
    if (serverKey in data && data[serverKey] !== undefined && data[serverKey] !== null) {
      (result as Record<string, unknown>)[localKey] = data[serverKey];
    }
  }
  return result;
}

export function useCalendarSettingsStore() {
  const queryClient = useQueryClient();

  const { data: serverSettings } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as Record<string, unknown> | null;
    },
    staleTime: 60_000,
  });

  const settings = useMemo(() => parseServerSettings(serverSettings ?? null), [serverSettings]);

  const mutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { data } = await api.put('/settings', patch);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });

  const updateSetting = useCallback(<K extends keyof CalendarSettings>(key: K, value: CalendarSettings[K]) => {
    queryClient.setQueryData(queryKeys.settings.all, (old: Record<string, unknown> | null | undefined) => ({
      ...(old ?? {}),
      [TO_SERVER[key]]: value,
    }));
    mutation.mutate({ [TO_SERVER[key]]: value });
  }, [queryClient, mutation]);

  return {
    ...settings,
    setDefaultView: useCallback((v: CalendarView) => updateSetting('defaultView', v), [updateSetting]),
    setWeekStartsOnMonday: useCallback((v: boolean) => updateSetting('weekStartsOnMonday', v), [updateSetting]),
    setShowWeekNumbers: useCallback((v: boolean) => updateSetting('showWeekNumbers', v), [updateSetting]),
    setDensity: useCallback((v: CalendarDensity) => updateSetting('density', v), [updateSetting]),
    setWorkStartHour: useCallback((v: number) => updateSetting('workStartHour', v), [updateSetting]),
    setWorkEndHour: useCallback((v: number) => updateSetting('workEndHour', v), [updateSetting]),
    setSecondaryTimezone: useCallback((v: string | null) => updateSetting('secondaryTimezone', v), [updateSetting]),
    setEventReminderMinutes: useCallback((v: number) => updateSetting('eventReminderMinutes', v), [updateSetting]),
  };
}
