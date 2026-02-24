import { Reply, CornerUpLeft, Forward, Archive, Trash2, Star, MailOpen } from 'lucide-react';
import { useEmailStore } from '../../stores/email-store';
import { useArchiveThread, useTrashThread, useToggleStar } from '../../hooks/use-threads';
import { Tooltip } from '../ui/tooltip';
import type { Thread } from '@atlasmail/shared';

interface EmailActionsProps {
  thread: Thread;
  onMarkUnread?: () => void;
}

interface ActionButton {
  icon: typeof Reply;
  label: string;
  shortcut?: string;
  action: () => void;
  active?: boolean;
  activeColor?: string;
  destructive?: boolean;
}

export function EmailActions({ thread, onMarkUnread }: EmailActionsProps) {
  const { openCompose } = useEmailStore();
  const archiveMutation = useArchiveThread();
  const trashMutation = useTrashThread();
  const starMutation = useToggleStar();

  const actions: ActionButton[] = [
    {
      icon: Reply,
      label: 'Reply',
      shortcut: 'R',
      action: () => openCompose('reply', thread.id),
    },
    {
      icon: CornerUpLeft,
      label: 'Reply all',
      shortcut: 'Shift+R',
      action: () => openCompose('reply_all', thread.id),
    },
    {
      icon: Forward,
      label: 'Forward',
      shortcut: 'F',
      action: () => openCompose('forward', thread.id),
    },
    {
      icon: Archive,
      label: 'Archive',
      shortcut: 'E',
      action: () => archiveMutation.mutate(thread.id),
    },
    {
      icon: Trash2,
      label: 'Trash',
      shortcut: '#',
      action: () => trashMutation.mutate(thread.id),
      destructive: true,
    },
    {
      icon: Star,
      label: thread.isStarred ? 'Unstar' : 'Star',
      shortcut: 'S',
      action: () => starMutation.mutate(thread.id),
      active: thread.isStarred,
      activeColor: 'var(--color-star)',
    },
    {
      icon: MailOpen,
      label: 'Mark unread',
      shortcut: 'Shift+U',
      action: () => onMarkUnread?.(),
    },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Email actions"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
        padding: 'var(--spacing-sm) var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border-primary)',
        background: 'var(--color-bg-secondary)',
        flexShrink: 0,
      }}
    >
      {actions.map(({ icon: Icon, label, shortcut, action, active, activeColor, destructive }) => (
        <Tooltip
          key={label}
          content={
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              {label}
              {shortcut && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    opacity: 0.7,
                  }}
                >
                  {shortcut}
                </span>
              )}
            </span>
          }
          side="bottom"
        >
          <button
            onClick={action}
            aria-label={label}
            aria-pressed={active}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: active
                ? activeColor || 'var(--color-accent-primary)'
                : destructive
                ? 'var(--color-text-tertiary)'
                : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'background var(--transition-fast), color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-hover)';
              if (destructive) e.currentTarget.style.color = 'var(--color-error)';
              else if (!active) e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = active
                ? activeColor || 'var(--color-accent-primary)'
                : destructive
                ? 'var(--color-text-tertiary)'
                : 'var(--color-text-secondary)';
            }}
          >
            <Icon
              size={16}
              fill={active && activeColor === 'var(--color-star)' ? 'var(--color-star)' : 'none'}
            />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
