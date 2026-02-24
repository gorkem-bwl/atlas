import { useState } from 'react';
import { Star, Reply, Archive, Trash2, Clock, Check } from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { Tooltip } from '../ui/tooltip';
import { formatRelativeTime } from '@atlasmail/shared';
import type { Thread } from '@atlasmail/shared';
import type { CSSProperties } from 'react';

interface EmailListItemProps {
  thread: Thread;
  isSelected: boolean;
  isCursor: boolean;
  isMultiSelected: boolean;
  onClick: () => void;
  onStarClick?: (e: React.MouseEvent) => void;
  onCheckboxClick?: (e: React.MouseEvent) => void;
  onReplyClick?: () => void;
  onArchiveClick?: () => void;
  onTrashClick?: () => void;
  onSnoozeClick?: () => void;
}

interface QuickActionButtonProps {
  icon: typeof Reply;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  destructive?: boolean;
}

function QuickActionButton({ icon: Icon, label, onClick, destructive = false }: QuickActionButtonProps) {
  return (
    <Tooltip content={label} side="top">
      <button
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
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
          e.currentTarget.style.background = 'var(--color-surface-active)';
          e.currentTarget.style.color = destructive
            ? 'var(--color-error)'
            : 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-tertiary)';
        }}
      >
        <Icon size={14} />
      </button>
    </Tooltip>
  );
}

export function EmailListItem({
  thread,
  isSelected,
  isCursor,
  isMultiSelected,
  onClick,
  onStarClick,
  onCheckboxClick,
  onReplyClick,
  onArchiveClick,
  onTrashClick,
  onSnoozeClick,
}: EmailListItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isUnread = thread.unreadCount > 0;
  const senderName = thread.emails?.[0]?.fromName || thread.emails?.[0]?.fromAddress || 'Unknown';
  const senderEmail = thread.emails?.[0]?.fromAddress || '';

  let background = 'transparent';
  if (isMultiSelected) background = 'var(--color-surface-selected)';
  else if (isSelected) background = 'var(--color-surface-selected)';
  else if (isCursor) background = 'var(--color-surface-hover)';
  else if (isHovered) background = 'var(--color-surface-hover)';

  // The gradient overlay needs to fade from transparent into the row's resolved bg color.
  // We use the same CSS variable references so dark/light themes work automatically.
  let gradientEndColor = 'var(--color-bg-primary)';
  if (isMultiSelected || isSelected) gradientEndColor = 'var(--color-surface-selected)';
  else if (isCursor || isHovered) gradientEndColor = 'var(--color-surface-hover)';

  // Show checkbox when hovering OR when this thread is multi-selected
  const showCheckbox = isHovered || isMultiSelected;

  return (
    <div
      role="option"
      aria-selected={isSelected || isMultiSelected}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--email-list-padding, 10px 16px)',
        height: 'var(--email-list-item-height, 64px)',
        background,
        cursor: 'pointer',
        borderBottom: '1px solid var(--color-border-secondary)',
        boxSizing: 'border-box',
        transition: 'background var(--transition-fast)',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Unread indicator / Checkbox — swaps based on hover or multi-select state */}
      <div
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showCheckbox ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCheckboxClick?.(e);
            }}
            aria-label={isMultiSelected ? 'Deselect conversation' : 'Select conversation'}
            aria-pressed={isMultiSelected}
            style={{
              width: 16,
              height: 16,
              border: isMultiSelected
                ? 'none'
                : '1.5px solid var(--color-border-primary)',
              borderRadius: 4,
              background: isMultiSelected ? 'var(--color-accent-primary)' : 'transparent',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background var(--transition-fast), border-color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (!isMultiSelected) {
                e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMultiSelected) {
                e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              }
            }}
          >
            {isMultiSelected && <Check size={10} color="#ffffff" strokeWidth={3} />}
          </button>
        ) : (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isUnread ? 'var(--color-unread-indicator)' : 'transparent',
              transition: 'background var(--transition-fast)',
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Avatar */}
      <Avatar name={senderName} email={senderEmail} size={32} />

      {/* Content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          overflow: 'hidden',
        }}
      >
        {/* Top row: sender + timestamp */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-sm)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: isUnread
                ? ('var(--font-weight-semibold)' as CSSProperties['fontWeight'])
                : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
              color: isUnread ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {senderName}
            {thread.messageCount > 1 && (
              <span
                style={{
                  marginLeft: 'var(--spacing-xs)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-tertiary)',
                  fontWeight: 'var(--font-weight-normal)' as CSSProperties['fontWeight'],
                }}
              >
                {thread.messageCount}
              </span>
            )}
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              color: isUnread ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              // Fade out the timestamp when quick actions are visible
              opacity: isHovered ? 0 : 1,
              transition: 'opacity var(--transition-fast)',
            }}
            aria-hidden={isHovered}
          >
            {formatRelativeTime(thread.lastMessageAt)}
          </span>
        </div>

        {/* Subject */}
        <span
          style={{
            fontSize: 'var(--font-size-md)',
            color: isUnread ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            fontWeight: isUnread
              ? ('var(--font-weight-medium)' as CSSProperties['fontWeight'])
              : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {thread.subject || '(no subject)'}
        </span>

        {/* Snippet */}
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {thread.snippet || ''}
        </span>
      </div>

      {/* Star — hidden when quick actions are showing */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStarClick?.(e);
        }}
        aria-label={thread.isStarred ? 'Unstar conversation' : 'Star conversation'}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 'var(--spacing-xs)',
          borderRadius: 'var(--radius-sm)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: thread.isStarred ? 'var(--color-star)' : 'var(--color-text-tertiary)',
          transition: 'color var(--transition-fast), opacity var(--transition-fast)',
          opacity: isHovered ? 0 : 1,
          pointerEvents: isHovered ? 'none' : 'auto',
        }}
        tabIndex={isHovered ? -1 : 0}
        onMouseEnter={(e) => {
          if (!thread.isStarred) {
            e.currentTarget.style.color = 'var(--color-star)';
          }
        }}
        onMouseLeave={(e) => {
          if (!thread.isStarred) {
            e.currentTarget.style.color = 'var(--color-text-tertiary)';
          }
        }}
      >
        <Star
          size={15}
          fill={thread.isStarred ? 'var(--color-star)' : 'none'}
        />
      </button>

      {/* Quick actions overlay — slides in from the right on hover */}
      <div
        aria-hidden={!isHovered}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          paddingRight: 'var(--spacing-sm)',
          // Gradient fades text under the buttons rather than hard-clipping it
          background: `linear-gradient(to right, transparent, ${gradientEndColor} 36px)`,
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateX(0)' : 'translateX(6px)',
          transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
          pointerEvents: isHovered ? 'auto' : 'none',
        }}
      >
        <QuickActionButton
          icon={Reply}
          label="Reply"
          onClick={() => onReplyClick?.()}
        />
        <QuickActionButton
          icon={Archive}
          label="Archive"
          onClick={() => onArchiveClick?.()}
        />
        <QuickActionButton
          icon={Trash2}
          label="Trash"
          onClick={() => onTrashClick?.()}
          destructive
        />
        <QuickActionButton
          icon={Clock}
          label="Snooze"
          onClick={() => onSnoozeClick?.()}
        />
      </div>
    </div>
  );
}
