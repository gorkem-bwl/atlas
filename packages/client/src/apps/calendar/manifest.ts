import { CalendarDays } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { CalendarPage } from '../../pages/calendar';

export const calendarManifest: ClientAppManifest = {
  id: 'calendar',
  name: 'Calendar',
  labelKey: 'sidebar.calendar',
  iconName: 'CalendarDays',
  icon: CalendarDays,
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
};
