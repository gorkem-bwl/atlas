import { create } from 'zustand';
import type { CalendarEvent } from '@atlasmail/shared';

interface PrefillData {
  summary?: string;
  description?: string;
  attendees?: Array<{ email: string; name?: string }>;
}

interface EventModalState {
  open: boolean;
  mode: 'create' | 'edit';
  event: CalendarEvent | null;
  defaultStart: string | null;
  defaultEnd: string | null;
  defaultIsAllDay: boolean | null;
  prefill: PrefillData | null;
}

interface CalendarStoreState {
  selectedDate: string; // YYYY-MM-DD
  view: 'week' | 'month-grid' | 'day' | 'agenda';
  weekStartsOnMonday: boolean;
  showWeekNumbers: boolean;
  calendarDensity: 'compact' | 'default' | 'comfortable';
  workStartHour: number;
  workEndHour: number;
  secondaryTimezone: string | null;
  defaultView: 'week' | 'month-grid' | 'day' | 'agenda';
  eventReminderMinutes: number;
  eventModal: EventModalState;
  setSelectedDate: (date: string) => void;
  setView: (view: 'week' | 'month-grid' | 'day' | 'agenda') => void;
  setWeekStartsOnMonday: (val: boolean) => void;
  setShowWeekNumbers: (val: boolean) => void;
  setCalendarDensity: (val: 'compact' | 'default' | 'comfortable') => void;
  setWorkStartHour: (val: number) => void;
  setWorkEndHour: (val: number) => void;
  setSecondaryTimezone: (tz: string | null) => void;
  setDefaultView: (val: 'week' | 'month-grid' | 'day' | 'agenda') => void;
  setEventReminderMinutes: (val: number) => void;
  openCreateModal: (start?: string, end?: string, isAllDay?: boolean) => void;
  openCreateModalWithPrefill: (prefill: PrefillData, start?: string, end?: string) => void;
  openEditModal: (event: CalendarEvent) => void;
  closeEventModal: () => void;
}

function toYMD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const useCalendarStore = create<CalendarStoreState>((set) => ({
  selectedDate: toYMD(),
  view: (localStorage.getItem('cal_defaultView') as 'week' | 'month-grid' | 'day' | 'agenda') || 'week',
  weekStartsOnMonday: localStorage.getItem('cal_weekStartsOnMonday') === 'true',
  showWeekNumbers: localStorage.getItem('cal_showWeekNumbers') === 'true',
  calendarDensity: (localStorage.getItem('cal_density') as 'compact' | 'default' | 'comfortable') || 'default',
  workStartHour: parseInt(localStorage.getItem('cal_workStartHour') || '9', 10),
  workEndHour: parseInt(localStorage.getItem('cal_workEndHour') || '17', 10),
  secondaryTimezone: localStorage.getItem('cal_secondaryTimezone') || null,
  defaultView: (localStorage.getItem('cal_defaultView') as 'week' | 'month-grid' | 'day' | 'agenda') || 'week',
  eventReminderMinutes: parseInt(localStorage.getItem('cal_eventReminderMinutes') || '10', 10),
  eventModal: {
    open: false,
    mode: 'create',
    event: null,
    defaultStart: null,
    defaultEnd: null,
    defaultIsAllDay: null,
    prefill: null,
  },
  setSelectedDate: (date) => set({ selectedDate: date }),
  setView: (view) => set({ view }),
  setWeekStartsOnMonday: (val) => {
    localStorage.setItem('cal_weekStartsOnMonday', String(val));
    set({ weekStartsOnMonday: val });
  },
  setShowWeekNumbers: (val) => {
    localStorage.setItem('cal_showWeekNumbers', String(val));
    set({ showWeekNumbers: val });
  },
  setCalendarDensity: (val) => {
    localStorage.setItem('cal_density', val);
    set({ calendarDensity: val });
  },
  setWorkStartHour: (val) => {
    localStorage.setItem('cal_workStartHour', String(val));
    set({ workStartHour: val });
  },
  setWorkEndHour: (val) => {
    localStorage.setItem('cal_workEndHour', String(val));
    set({ workEndHour: val });
  },
  setSecondaryTimezone: (tz) => {
    if (tz) localStorage.setItem('cal_secondaryTimezone', tz);
    else localStorage.removeItem('cal_secondaryTimezone');
    set({ secondaryTimezone: tz });
  },
  setDefaultView: (val) => {
    localStorage.setItem('cal_defaultView', val);
    set({ defaultView: val });
  },
  setEventReminderMinutes: (val) => {
    localStorage.setItem('cal_eventReminderMinutes', String(val));
    set({ eventReminderMinutes: val });
  },
  openCreateModal: (start, end, isAllDay) =>
    set({
      eventModal: {
        open: true,
        mode: 'create',
        event: null,
        defaultStart: start ?? null,
        defaultEnd: end ?? null,
        defaultIsAllDay: isAllDay ?? null,
        prefill: null,
      },
    }),
  openCreateModalWithPrefill: (prefill, start, end) =>
    set({
      eventModal: {
        open: true,
        mode: 'create',
        event: null,
        defaultStart: start ?? null,
        defaultEnd: end ?? null,
        defaultIsAllDay: null,
        prefill,
      },
    }),
  openEditModal: (event) =>
    set({
      eventModal: {
        open: true,
        mode: 'edit',
        event,
        defaultStart: null,
        defaultEnd: null,
        defaultIsAllDay: null,
        prefill: null,
      },
    }),
  closeEventModal: () =>
    set((s) => ({
      eventModal: { ...s.eventModal, open: false },
    })),
}));
