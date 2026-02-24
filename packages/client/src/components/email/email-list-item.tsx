import { Star } from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { formatRelativeTime } from '@atlasmail/shared';
import type { Thread } from '@atlasmail/shared';
import type { CSSProperties } from 'react';

interface EmailListItemProps {
  thread: Thread;
  isSelected: boolean;
  isCursor: boolean;
  onClick: () => void;
  onStarClick?: (e: React.MouseEvent) => void;
}

export function EmailListItem({
  thread,
  isSelected,
  isCursor,
  onClick,
  onStarClick,
}: EmailListItemProps) {
  const isUnread = thread.unreadCount > 0;
  const senderName = thread.emails?.[0]?.fromName || thread.emails?.[0]?.fromAddress || 'Unknown';
  const senderEmail = thread.emails?.[0]?.fromAddress || '';

  let background = 'transparent';
  if (isSelected) background = 'var(--color-surface-selected)';
  else if (isCursor) background = 'var(--color-surface-hover)';

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
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
      onMouseEnter={(e) => {
        if (!isSelected && !isCursor) {
          e.currentTarget.style.background = 'var(--color-surface-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !isCursor) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {/* Unread indicator */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isUnread ? 'var(--color-unread-indicator)' : 'transparent',
          flexShrink: 0,
          transition: 'background var(--transition-fast)',
        }}
        aria-hidden="true"
      />

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
            }}
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

      {/* Star */}
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
          transition: 'color var(--transition-fast)',
        }}
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
    </div>
  );
}
