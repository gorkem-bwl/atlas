import {
  Inbox, Star, Calendar, Coffee, CircleDot, BookOpen, Users, Moon,
} from 'lucide-react';
import type { TaskWhen, RecurrenceRule } from '@atlasmail/shared';

// ─── Navigation sections (Things 3 inspired) ────────────────────────

export type NavSection = 'inbox' | 'today' | 'upcoming' | 'anytime' | 'someday' | 'logbook' | 'calendar' | 'assignedToMe' | 'team' | `project:${string}` | `tag:${string}`;

export interface NavItem {
  id: NavSection;
  labelKey: string;
  icon: typeof Inbox;
  color: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'inbox', labelKey: 'tasks.inbox', icon: Inbox, color: '#3b82f6' },
  { id: 'today', labelKey: 'tasks.today', icon: Star, color: '#f59e0b' },
  { id: 'upcoming', labelKey: 'tasks.upcoming', icon: Calendar, color: '#ef4444' },
  { id: 'anytime', labelKey: 'tasks.anytime', icon: CircleDot, color: '#06b6d4' },
  { id: 'someday', labelKey: 'tasks.someday', icon: Coffee, color: '#a78bfa' },
  { id: 'logbook', labelKey: 'tasks.logbook', icon: BookOpen, color: '#6b7280' },
  { id: 'team', labelKey: 'tasks.teamTasks', icon: Users, color: '#10b981' },
];

// ─── Priority selector ──────────────────────────────────────────────

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'low', label: 'Low', color: '#3b82f6' },
  { value: 'none', label: 'None', color: 'transparent' },
] as const;

export const WHEN_OPTIONS: { value: TaskWhen; label: string; icon: typeof Inbox }[] = [
  { value: 'inbox', label: 'Inbox', icon: Inbox },
  { value: 'today', label: 'Today', icon: Star },
  { value: 'evening', label: 'This evening', icon: Moon },
  { value: 'anytime', label: 'Anytime', icon: CircleDot },
  { value: 'someday', label: 'Someday', icon: Coffee },
];

export const RECURRENCE_OPTIONS: { value: RecurrenceRule | ''; labelKey: string }[] = [
  { value: '', labelKey: 'tasks.repeatNone' },
  { value: 'daily', labelKey: 'tasks.repeatDaily' },
  { value: 'weekdays', labelKey: 'tasks.repeatWeekdays' },
  { value: 'weekly', labelKey: 'tasks.repeatWeekly' },
  { value: 'biweekly', labelKey: 'tasks.repeatBiweekly' },
  { value: 'monthly', labelKey: 'tasks.repeatMonthly' },
  { value: 'yearly', labelKey: 'tasks.repeatYearly' },
];
