import { Archive, Trash2, Star, Mail, MailOpen, X } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';

interface BulkActionsProps {
  selectedCount: number;
  onArchive: () => void;
  onTrash: () => void;
  onStar: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onClearSelection: () => void;
}

interface BulkActionButtonProps {
  icon: typeof Archive;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

function BulkActionButton({ icon: Icon, label, onClick, destructive = false }: BulkActionButtonProps) {
  return (
    <Tooltip content={label} side="bottom">
      <button
        onClick={onClick}
        aria-label={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          border: 'none',
          borderRadius: 'var(--radius-md)',
          background: 'transparent',
          color: destructive ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background var(--transition-fast), color var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-surface-hover)';
          e.currentTarget.style.color = destructive
            ? 'var(--color-error)'
            : 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = destructive
            ? 'var(--color-text-tertiary)'
            : 'var(--color-text-secondary)';
        }}
      >
        <Icon size={16} />
      </button>
    </Tooltip>
  );
}

export function BulkActions({
  selectedCount,
  onArchive,
  onTrash,
  onStar,
  onMarkRead,
  onMarkUnread,
  onClearSelection,
}: BulkActionsProps) {
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
        padding: '0 var(--spacing-md)',
        height: 40,
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-primary)',
        flexShrink: 0,
      }}
    >
      {/* Selected count label */}
      <span
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-accent-primary)',
          whiteSpace: 'nowrap',
          marginRight: 'var(--spacing-xs)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {selectedCount} selected
      </span>

      {/* Divider */}
      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 18,
          background: 'var(--color-border-primary)',
          flexShrink: 0,
          marginRight: 'var(--spacing-xs)',
        }}
      />

      <BulkActionButton icon={Archive} label="Archive selected" onClick={onArchive} />
      <BulkActionButton icon={Trash2} label="Trash selected" onClick={onTrash} destructive />
      <BulkActionButton icon={Star} label="Star selected" onClick={onStar} />
      <BulkActionButton icon={Mail} label="Mark as unread" onClick={onMarkUnread} />
      <BulkActionButton icon={MailOpen} label="Mark as read" onClick={onMarkRead} />

      {/* Spacer pushes clear button to the far right */}
      <div style={{ flex: 1 }} />

      <Tooltip content="Clear selection" side="bottom">
        <button
          onClick={onClearSelection}
          aria-label="Clear selection"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            border: 'none',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background var(--transition-fast), color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-hover)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-tertiary)';
          }}
        >
          <X size={16} />
        </button>
      </Tooltip>
    </div>
  );
}
