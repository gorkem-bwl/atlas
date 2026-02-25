import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Reply, CornerUpLeft, Forward, Archive, Trash2, Star, MailOpen, Clock, AlertOctagon, Ban } from 'lucide-react';
import { useEmailStore } from '../../stores/email-store';
import { useArchiveWithUndo, useTrashWithUndo, useToggleStar, useSnoozeThread, useSpamWithUndo, useMarkReadUnread, useMailboxThreads, useBlockSender } from '../../hooks/use-threads';
import { useAutoAdvance } from '../../hooks/use-auto-advance';
import { useToastStore } from '../../stores/toast-store';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { queryKeys } from '../../config/query-keys';
import { Tooltip } from '../ui/tooltip';
import { SnoozePopover } from './snooze-popover';
import { useValueChangeAnimation, injectStarPop } from '../../lib/animations';
import type { Thread } from '@atlasmail/shared';

injectStarPop();

interface EmailActionsProps {
  thread: Thread;
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

export function EmailActions({ thread }: EmailActionsProps) {
  const { t } = useTranslation();
  const { openCompose, activeMailbox, activeCategory, cursorIndex } = useEmailStore();
  const archiveWithUndo = useArchiveWithUndo();
  const trashWithUndo = useTrashWithUndo();
  const starMutation = useToggleStar();
  const snoozeMutation = useSnoozeThread();
  const spamWithUndo = useSpamWithUndo();
  const markReadUnread = useMarkReadUnread();
  const blockSender = useBlockSender();
  const addToast = useToastStore((s) => s.addToast);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const starAnimating = useValueChangeAnimation(thread.isStarred, true, 500);

  // Derive the correct TanStack Query list key for the currently visible thread
  // list, so optimistic updates in undo hooks target the right cache entry.
  const isInbox = activeMailbox === 'inbox';
  const categoryFilter = isInbox && activeCategory !== 'all' ? activeCategory : undefined;
  const activeListKey = queryKeys.threads.mailbox(activeMailbox, categoryFilter);
  const { data: rawThreads } = useMailboxThreads(activeMailbox, categoryFilter);
  const displayThreads = useMemo(() => rawThreads ?? [], [rawThreads]);
  const advanceAfterRemoval = useAutoAdvance(displayThreads);

  const actions: ActionButton[] = [
    {
      icon: Reply,
      label: t('compose.reply'),
      shortcut: 'R',
      action: () => openCompose('reply', thread.id),
    },
    {
      icon: CornerUpLeft,
      label: t('compose.replyAll'),
      shortcut: 'Shift+R',
      action: () => openCompose('reply_all', thread.id),
    },
    {
      icon: Forward,
      label: t('compose.forward'),
      shortcut: 'F',
      action: () => openCompose('forward', thread.id),
    },
    {
      icon: Archive,
      label: t('email.archive'),
      shortcut: 'E',
      action: () => {
        advanceAfterRemoval(thread.id, cursorIndex);
        archiveWithUndo(thread.id, activeListKey);
      },
    },
    {
      icon: Trash2,
      label: t('email.delete'),
      shortcut: '#',
      action: () => {
        advanceAfterRemoval(thread.id, cursorIndex);
        trashWithUndo(thread.id, activeListKey);
      },
      destructive: true,
    },
    {
      icon: AlertOctagon,
      label: t('email.reportSpam'),
      action: () => {
        advanceAfterRemoval(thread.id, cursorIndex);
        spamWithUndo(thread.id, activeListKey);
      },
      destructive: true,
    },
    {
      icon: Ban,
      label: t('email.blockSender'),
      action: () => setShowBlockConfirm(true),
      destructive: true,
    },
    {
      icon: Star,
      label: thread.isStarred ? t('email.unstar') : t('email.star'),
      shortcut: 'S',
      action: () => starMutation.mutate(thread.id),
      active: thread.isStarred,
      activeColor: 'var(--color-star)',
    },
  ];

  const afterSnoozeActions: ActionButton[] = [
    {
      icon: MailOpen,
      label: t('email.markUnread'),
      shortcut: 'Shift+U',
      action: () => markReadUnread.mutate({ threadId: thread.id, isUnread: true }),
    },
  ];

  function renderActionButton({
    icon: Icon,
    label,
    shortcut,
    action,
    active,
    activeColor,
    destructive,
  }: ActionButton) {
    return (
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
              : 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'background var(--transition-normal), color var(--transition-normal), transform 80ms ease',
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
              : 'var(--color-text-secondary)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.92)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Icon
            size={16}
            fill={active && activeColor === 'var(--color-star)' ? 'var(--color-star)' : 'none'}
            style={active && activeColor === 'var(--color-star)' && starAnimating ? { animation: 'atlasmail-star-pop 500ms ease' } : undefined}
          />
        </button>
      </Tooltip>
    );
  }

  return (
    <>
      <div
        role="toolbar"
        aria-label={t('email.emailActions')}
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
        {actions.map(renderActionButton)}

        {/* Snooze — between Star and Mark unread */}
        <SnoozePopover
          threadId={thread.id}
          onSnooze={(threadId, snoozeUntil) => {
            snoozeMutation.mutate({ threadId, snoozeUntil: snoozeUntil.toISOString() });
          }}
        >
          <Tooltip content={`${t('email.snooze')} (H)`} side="bottom">
          <button
            aria-label={t('email.snooze')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'background var(--transition-normal), color var(--transition-normal), transform 80ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.92)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Clock size={16} />
          </button>
          </Tooltip>
        </SnoozePopover>

        {afterSnoozeActions.map(renderActionButton)}
      </div>

      <ConfirmDialog
        open={showBlockConfirm}
        onOpenChange={setShowBlockConfirm}
        title={t('email.blockSenderConfirm')}
        description={t('email.blockSenderDescription')}
        confirmLabel={t('email.blockSender')}
        onConfirm={() => {
          const emails = thread.emails ?? [];
          const senderEmail = emails[emails.length - 1]?.fromAddress || '';
          if (!senderEmail) return;
          advanceAfterRemoval(thread.id, cursorIndex);
          blockSender.mutate(
            { threadId: thread.id, senderEmail },
            { onSuccess: () => addToast({ type: 'success', message: t('email.senderBlocked'), duration: 3000 }) },
          );
        }}
      />
    </>
  );
}
