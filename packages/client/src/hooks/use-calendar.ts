import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type {
  Calendar,
  CalendarEvent,
  CalendarEventCreateInput,
  CalendarEventUpdateInput,
} from '@atlasmail/shared';

export function useCalendars() {
  return useQuery({
    queryKey: queryKeys.calendar.calendars,
    queryFn: async () => {
      const { data } = await api.get('/calendar/calendars');
      return data.data as Calendar[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useCalendarEvents(timeMin: string, timeMax: string) {
  return useQuery({
    queryKey: queryKeys.calendar.events(timeMin, timeMax),
    queryFn: async () => {
      const { data } = await api.get('/calendar/events', {
        params: { timeMin, timeMax },
      });
      return data.data as CalendarEvent[];
    },
    staleTime: 2 * 60_000,
    enabled: !!timeMin && !!timeMax,
  });
}

export function useSyncCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/calendar/sync');
      return data.data as { calendars: Calendar[]; events: CalendarEvent[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CalendarEventCreateInput) => {
      const { data } = await api.post('/calendar/events', input);
      return data.data as CalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, ...input }: CalendarEventUpdateInput & { eventId: string }) => {
      const { data } = await api.patch(`/calendar/events/${eventId}`, input);
      return data.data as CalendarEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      await api.delete(`/calendar/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export function useToggleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ calendarId, isSelected }: { calendarId: string; isSelected: boolean }) => {
      await api.patch(`/calendar/calendars/${calendarId}/toggle`, { isSelected });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}
