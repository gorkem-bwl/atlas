import { Calendar as CalendarIcon } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { CalendarPage } from '../../pages/calendar';

export const calendarManifest: ClientAppManifest = {
  id: 'calendar',
  name: 'Calendar',
  labelKey: 'sidebar.calendar',
  iconName: 'CalendarDays',
  icon: CalendarIcon,
  color: '#f97316',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 27,

  routes: [
    { path: '/calendar', component: CalendarPage },
  ],
  tour: {
    variant: 'activity',
    illustrationData: {
      contact: { initials: 'CW', avatarColor: '#f97316', name: 'Client workshop', meta: 'Today · 14:00 — 16:00 · Room 3', badge: { label: 'Today', tone: 'info' } },
      events: [
        { text: 'Maria added a Zoom link', timestamp: 'just now', isLive: true },
        { text: 'Reminder set · 30 min before', timestamp: '1h ago' },
        { text: '3 attendees confirmed', timestamp: 'yesterday' },
        { text: 'Event created from CRM lead', timestamp: '3d ago' },
      ],
    },
  },
};
