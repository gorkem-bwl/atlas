import { useState } from 'react';
import { FileText } from 'lucide-react';

// ─── Flat doc row (for favorites, recent, trash) ────────────────────────

export function FlatDocRow({
  id,
  title,
  icon,
  isSelected,
  onClick,
  action,
  muted,
}: {
  id: string;
  title: string;
  icon: string | null;
  isSelected: boolean;
  onClick: () => void;
  action?: React.ReactNode;
  muted?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        height: 28,
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        margin: '0 4px',
        background: isSelected
          ? 'var(--color-surface-selected)'
          : hovered
            ? 'var(--color-surface-hover)'
            : 'transparent',
        opacity: muted ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>
        {icon || <FileText size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontWeight: isSelected ? 500 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {title || 'Untitled'}
      </span>
      {hovered && action && (
        <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  );
}
