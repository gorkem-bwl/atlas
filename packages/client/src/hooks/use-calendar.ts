import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from '../config/query-keys';
import type {
  Calendar,
  CalendarEvent,
  CalendarEventCreateInput,
  CalendarEventUpdateInput,
} from '@atlas-platform/shared';

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

export function useCalendarEvents(timeMin: string, timeMax: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.calendar.events(timeMin, timeMax),
    queryFn: async () => {
      const { data } = await api.get('/calendar/events', {
        params: { timeMin, timeMax },
      });
      return data.data as CalendarEvent[];
    },
    staleTime: 2 * 60_000,
    enabled: (options?.enabled ?? true) && !!timeMin && !!timeMax,
  });
}

export interface AggregatedEvent {
  id: string;
  source: 'google' | 'crm' | 'hr-leave' | 'task';
  sourceId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  color: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

export function useAggregatedEvents(timeMin: string, timeMax: string) {
  return useQuery({
    queryKey: ['calendar', 'aggregated', timeMin, timeMax],
    queryFn: async () => {
      const { data } = await api.get('/calendar/events/aggregated', {
        params: { timeMin, timeMax },
      });
      return data.data as AggregatedEvent[];
    },
    staleTime: 30_000,
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
    onMutate: async (input) => {
      // Cancel ongoing fetches so they don't overwrite the optimistic entry
      await queryClient.cancelQueries({ queryKey: queryKeys.calendar.all });

      // Snapshot all event caches for rollback
      const previousQueries = queryClient.getQueriesData<CalendarEvent[]>({
        queryKey: ['calendar', 'events'],
      });

      // Build a temporary event from the input data
      const now = new Date().toISOString();
      const tempEvent: CalendarEvent = {
        id: `temp-${Date.now()}`,
        accountId: '',
        calendarId: input.calendarId,
        googleEventId: '',
        summary: input.summary,
        description: input.description ?? null,
        location: input.location ?? null,
        startTime: input.startTime,
        endTime: input.endTime,
        isAllDay: input.isAllDay ?? false,
        status: 'confirmed',
        selfResponseStatus: 'accepted',
        htmlLink: null,
        hangoutLink: null,
        organizer: null,
        attendees: input.attendees ?? null,
        recurrence: input.recurrence ?? null,
        recurringEventId: null,
        transparency: input.transparency ?? null,
        colorId: input.colorId ?? null,
        reminders: input.reminders ?? null,
        createdAt: now,
        updatedAt: now,
      };

      // Optimistically insert into all event caches that cover this event's time range
      queryClient.setQueriesData<CalendarEvent[]>(
        { queryKey: ['calendar', 'events'] },
        (old) => {
          if (!old) return old;
          return [...old, tempEvent];
        },
      );

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      // Roll back to the previous state on failure
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
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
    onMutate: async ({ eventId, ...input }) => {
      // Cancel ongoing fetches
      await queryClient.cancelQueries({ queryKey: queryKeys.calendar.all });

      // Snapshot all event caches
      const previousQueries = queryClient.getQueriesData<CalendarEvent[]>({
        queryKey: ['calendar', 'events'],
      });

      // Optimistically update all event caches
      queryClient.setQueriesData<CalendarEvent[]>(
        { queryKey: ['calendar', 'events'] },
        (old) => {
          if (!old) return old;
          return old.map((ev) =>
            ev.id === eventId
              ? {
                  ...ev,
                  ...(input.summary !== undefined && { summary: input.summary }),
                  ...(input.startTime !== undefined && { startTime: input.startTime }),
                  ...(input.endTime !== undefined && { endTime: input.endTime }),
                  ...(input.description !== undefined && { description: input.description }),
                  ...(input.location !== undefined && { location: input.location }),
                  ...(input.isAllDay !== undefined && { isAllDay: input.isAllDay }),
                  ...(input.colorId !== undefined && { colorId: input.colorId }),
                  ...(input.calendarId !== undefined && { calendarId: input.calendarId }),
                }
              : ev,
          );
        },
      );

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      // Roll back to previous state
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, scope }: { eventId: string; scope?: 'single' | 'all' }) => {
      await api.delete(`/calendar/events/${eventId}`, { params: scope ? { scope } : undefined });
    },
    onMutate: async ({ eventId, scope }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.calendar.all });

      const previousQueries = queryClient.getQueriesData<CalendarEvent[]>({
        queryKey: ['calendar', 'events'],
      });

      // Optimistically remove from all event caches
      queryClient.setQueriesData<CalendarEvent[]>(
        { queryKey: ['calendar', 'events'] },
        (old) => {
          if (!old) return old;
          if (scope === 'all') {
            // Remove all instances of this recurring event
            const target = old.find((ev) => ev.id === eventId);
            if (target?.recurringEventId) {
              return old.filter(
                (ev) => ev.recurringEventId !== target.recurringEventId && ev.googleEventId !== target.recurringEventId,
              );
            }
          }
          return old.filter((ev) => ev.id !== eventId);
        },
      );

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export function useFreeBusy(emails: string[], timeMin: string, timeMax: string) {
  return useQuery({
    queryKey: queryKeys.calendar.freeBusy(emails.join(','), timeMin, timeMax),
    queryFn: async () => {
      const { data } = await api.post('/calendar/freebusy', { emails, timeMin, timeMax });
      return data.data as Record<string, Array<{ start: string; end: string }>>;
    },
    enabled: emails.length > 0 && !!timeMin && !!timeMax,
    staleTime: 2 * 60_000,
  });
}

export function useSearchCalendarEvents(query: string) {
  return useQuery({
    queryKey: queryKeys.calendar.search(query),
    queryFn: async () => {
      const { data } = await api.get('/calendar/events/search', { params: { q: query } });
      return data.data as CalendarEvent[];
    },
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useCreateCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { summary: string; description?: string; backgroundColor?: string }) => {
      const { data } = await api.post('/calendar/calendars', input);
      return data.data as Calendar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.calendars });
    },
  });
}

export function useToggleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ calendarId, isSelected }: { calendarId: string; isSelected: boolean }) => {
      await api.patch(`/calendar/calendars/${calendarId}/toggle`, { isSelected });
    },
    onMutate: async ({ calendarId, isSelected }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.calendar.calendars });

      const previous = queryClient.getQueryData<Calendar[]>(queryKeys.calendar.calendars);

      queryClient.setQueryData<Calendar[]>(queryKeys.calendar.calendars, (old) => {
        if (!old) return old;
        return old.map((c) => (c.id === calendarId ? { ...c, isSelected } : c));
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.calendar.calendars, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}
