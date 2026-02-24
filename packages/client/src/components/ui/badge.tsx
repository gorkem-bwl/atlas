import type { ReactNode, CSSProperties } from 'react';
import type { EmailCategory } from '@atlasmail/shared';

// Category-specific badge
interface CategoryBadgeProps {
  category: EmailCategory;
}

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  important: 'Important',
  other: 'Other',
  newsletters: 'Newsletters',
  notifications: 'Notifications',
};

const CATEGORY_COLORS: Record<EmailCategory, string> = {
  important: 'var(--color-category-important)',
  other: 'var(--color-category-other)',
  newsletters: 'var(--color-category-newsletters)',
  notifications: 'var(--color-category-notifications)',
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '18px',
        padding: '0 var(--spacing-xs)',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-xs)',
        fontFamily: 'var(--font-family)',
        fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
        whiteSpace: 'nowrap',
      }}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

// Generic badge
interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  children: ReactNode;
}

const VARIANT_STYLES: Record<NonNullable<BadgeProps['variant']>, CSSProperties> = {
  default: {
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border-primary)',
  },
  primary: {
    background: 'rgba(59, 130, 246, 0.15)',
    color: 'var(--color-accent-primary)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  success: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--color-success)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.15)',
    color: 'var(--color-warning)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--color-error)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '20px',
        padding: '0 var(--spacing-xs)',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-xs)',
        fontFamily: 'var(--font-family)',
        fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
        whiteSpace: 'nowrap',
        ...VARIANT_STYLES[variant],
      }}
    >
      {children}
    </span>
  );
}
