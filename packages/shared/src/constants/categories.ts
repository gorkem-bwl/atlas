import type { EmailCategory } from '../types/email';

export interface CategoryDefinition {
  id: EmailCategory;
  label: string;
  description: string;
  color: string;
  icon: string;
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'important',
    label: 'Important',
    description: 'Emails from people you know',
    color: 'var(--color-category-important)',
    icon: 'inbox',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Everything else',
    color: 'var(--color-category-other)',
    icon: 'mail',
  },
  {
    id: 'newsletters',
    label: 'Newsletters',
    description: 'Subscriptions and mailing lists',
    color: 'var(--color-category-newsletters)',
    icon: 'newspaper',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Automated notifications',
    color: 'var(--color-category-notifications)',
    icon: 'bell',
  },
];
