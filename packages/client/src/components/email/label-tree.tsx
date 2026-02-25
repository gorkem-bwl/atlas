import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { Label } from '../../lib/labels';

export interface LabelTreeProps {
  labels: Label[];
  parentId: string | null;
  depth: number;
  activeLabel: string | null;
  onSelect: (labelId: string) => void;
}

interface LabelNodeProps {
  label: Label;
  labels: Label[];
  depth: number;
  activeLabel: string | null;
  onSelect: (labelId: string) => void;
}

const MAX_LABEL_DEPTH = 5;

function LabelNode({ label, labels, depth, activeLabel, onSelect }: LabelNodeProps) {
  const children = depth < MAX_LABEL_DEPTH ? labels.filter((l) => l.parentId === label.id) : [];
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);
  const isActive = activeLabel === label.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(label.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-pressed={isActive}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          width: '100%',
          paddingLeft: 8 + depth * 12,
          paddingRight: 'var(--spacing-md)',
          paddingTop: 6,
          paddingBottom: 6,
          background: isActive
            ? 'var(--color-surface-selected)'
            : hovered
            ? 'var(--color-surface-hover)'
            : 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          fontWeight: isActive ? 500 : 400,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background var(--transition-normal), color var(--transition-normal)',
          boxSizing: 'border-box',
        }}
      >
        {/* Expand/collapse toggle — reserve space even when no children */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 14,
            height: 14,
            flexShrink: 0,
            color: 'var(--color-text-tertiary)',
            visibility: hasChildren ? 'visible' : 'hidden',
          }}
          onClick={(e) => {
            if (!hasChildren) return;
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          role={hasChildren ? 'button' : undefined}
          aria-label={hasChildren ? (expanded ? 'Collapse' : 'Expand') : undefined}
          tabIndex={hasChildren ? 0 : undefined}
          onKeyDown={(e) => {
            if (!hasChildren) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }
          }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>

        {/* Color dot */}
        <span
          style={{
            flexShrink: 0,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: label.color,
          }}
        />

        {/* Label name */}
        <span
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label.name}
        </span>
      </button>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <LabelNode
              key={child.id}
              label={child}
              labels={labels}
              depth={depth + 1}
              activeLabel={activeLabel}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LabelTree({ labels, parentId, depth, activeLabel, onSelect }: LabelTreeProps) {
  const rootLabels = labels.filter((l) => l.parentId === parentId);

  if (rootLabels.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {rootLabels.map((label) => (
        <LabelNode
          key={label.id}
          label={label}
          labels={labels}
          depth={depth}
          activeLabel={activeLabel}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
