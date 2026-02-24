import type { Label } from '../../lib/labels';

interface LabelChipProps {
  label: Label;
}

/**
 * Small colored pill displaying a thread label.
 *
 * Usage:
 *   <LabelChip label={{ id: 'urgent', name: 'Urgent', color: '#dc2626' }} />
 */
export function LabelChip({ label }: LabelChipProps) {
  return (
    <span
      aria-label={`Label: ${label.name}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10,
        lineHeight: 1,
        fontFamily: 'var(--font-family)',
        fontWeight: 500,
        padding: '2px 6px',
        borderRadius: 'var(--radius-full)',
        // Background is the label color at ~15% opacity
        backgroundColor: `${label.color}26`,
        // Text uses the full label color
        color: label.color,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        letterSpacing: '0.01em',
      }}
    >
      {label.name}
    </span>
  );
}
