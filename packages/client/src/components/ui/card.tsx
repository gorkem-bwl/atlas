import { type CSSProperties, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';

/**
 * Shared Card primitive.
 *
 * Matches the visual language of `StatCard` (same padding, radius, border,
 * background) but accepts free-form `children` so it can hold any content
 * — list items, department cards, project cards, etc. Optional
 * `accentColor` renders a 4px colored stripe across the top. Optional
 * `interactive` enables hover shadow + background shift and gives the
 * whole card a pointer cursor.
 *
 * When to use which:
 *   - Single KPI/metric tile with just label + value → `<StatCard>`
 *   - Anything richer (multiple sections, actions, descriptions) →
 *     `<Card>` with children.
 */

export interface CardProps {
  children: ReactNode;
  /** Optional 4px color stripe rendered flush against the top edge. */
  accentColor?: string;
  /** When true, the card gets a hover effect and pointer cursor. */
  interactive?: boolean;
  /** Click handler. Implies `interactive` when provided. */
  onClick?: (e: ReactMouseEvent<HTMLDivElement>) => void;
  /** Extra style merged on top of the defaults. */
  style?: CSSProperties;
  /** Pass-through class. */
  className?: string;
}

export function Card({
  children,
  accentColor,
  interactive: interactiveProp,
  onClick,
  style,
  className,
}: CardProps) {
  const interactive = interactiveProp || !!onClick;
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, background 0.15s',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!interactive) return;
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.background = 'var(--color-surface-hover)';
      }}
      onMouseLeave={(e) => {
        if (!interactive) return;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.background = 'var(--color-bg-primary)';
      }}
    >
      {accentColor && (
        <div style={{ height: 4, background: accentColor }} />
      )}
      {/* Inner padding matches StatCard's 18px 20px for visual consistency
          across the app. */}
      <div style={{ padding: '18px 20px' }}>
        {children}
      </div>
    </div>
  );
}
