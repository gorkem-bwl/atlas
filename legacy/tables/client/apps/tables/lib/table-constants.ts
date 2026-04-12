import type { TableColumn, TableRow, TableFieldType } from '@atlas-platform/shared';
import {
  ClipboardList, Users, Package, DollarSign, CalendarDays, Bug, Plug, Rocket,
  Wrench, Calendar, Megaphone, Search, Target, Building2, CheckSquare, BookOpen,
  Plane, PartyPopper, Scale, Link2, Table2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────

export const PLACEHOLDER_ROW_ID = '__placeholder__';
export const ROW_HEIGHT_MAP: Record<string, number> = { short: 28, medium: 36, tall: 52, extraTall: 72 };
export const LAST_TABLE_KEY = 'atlasmail_tables_last_selected';

export const FIELD_TYPES: { value: TableFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'singleSelect', label: 'Single select' },
  { value: 'multiSelect', label: 'Multi select' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'currency', label: 'Currency' },
  { value: 'phone', label: 'Phone' },
  { value: 'rating', label: 'Rating' },
  { value: 'percent', label: 'Percent' },
  { value: 'longText', label: 'Long text' },
  { value: 'attachment', label: 'Attachment' },
  { value: 'linkedRecord', label: 'Linked record' },
  { value: 'lookup', label: 'Lookup' },
  { value: 'rollup', label: 'Rollup' },
];

// ─── Template icon resolver ────────────────────────────────────────

export const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  ClipboardList, Users, Package, DollarSign, CalendarDays, Bug, Plug, Rocket,
  Wrench, Calendar, Megaphone, Search, Target, Building2, CheckSquare, BookOpen,
  Plane, PartyPopper, Scale, Link2,
};

export function getTemplateIcon(iconName: string): LucideIcon {
  return TEMPLATE_ICONS[iconName] || Table2;
}

// ─── Default columns/rows for new tables ────────────────────────────

export function createDefaultColumns(): TableColumn[] {
  return [
    { id: crypto.randomUUID(), name: 'Name', type: 'text', width: 250 },
    { id: crypto.randomUUID(), name: 'Notes', type: 'longText', width: 300 },
    {
      id: crypto.randomUUID(),
      name: 'Status',
      type: 'singleSelect',
      width: 180,
      options: ['Todo', 'In progress', 'Done'],
    },
  ];
}

export function createDefaultRows(count = 3): TableRow[] {
  return Array.from({ length: count }, () => ({
    _id: crypto.randomUUID(),
    _createdAt: new Date().toISOString(),
  }));
}
