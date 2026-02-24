import { Mail } from 'lucide-react';
import { useEmailStore } from '../../stores/email-store';
import { useThread } from '../../hooks/use-threads';
import { EmailActions } from '../email/email-actions';
import { EmailMessage } from '../email/email-message';
import { Kbd } from '../ui/kbd';
import type { CSSProperties } from 'react';

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--spacing-md)',
        color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-family)',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        <Mail size={24} style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
      <span
        style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
          color: 'var(--color-text-secondary)',
        }}
      >
        Select a conversation
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <span>Use</span>
        <Kbd shortcut="j" variant="inline" />
        <span>/</span>
        <Kbd shortcut="k" variant="inline" />
        <span>to navigate, then</span>
        <Kbd shortcut="Enter" variant="inline" />
        <span>to open</span>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--font-size-md)',
        fontFamily: 'var(--font-family)',
      }}
    >
      Loading...
    </div>
  );
}

export function ReadingPane() {
  const { activeThreadId } = useEmailStore();
  const { data: thread, isLoading } = useThread(activeThreadId);

  if (!activeThreadId) {
    return <EmptyState />;
  }

  if (isLoading || !thread) {
    return <LoadingState />;
  }

  const emails = thread.emails || [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Thread subject header */}
      <div
        style={{
          padding: 'var(--spacing-lg) var(--spacing-xl)',
          borderBottom: '1px solid var(--color-border-primary)',
          background: 'var(--color-bg-secondary)',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            lineHeight: 'var(--line-height-tight)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {thread.subject || '(no subject)'}
        </h1>
        {thread.messageCount > 1 && (
          <p
            style={{
              margin: 'var(--spacing-xs) 0 0',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {thread.messageCount} messages
          </p>
        )}
      </div>

      {/* Action toolbar */}
      <EmailActions thread={thread} />

      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {emails.length === 0 ? (
          <div
            style={{
              padding: 'var(--spacing-xl)',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
              textAlign: 'center',
            }}
          >
            No messages in this thread.
          </div>
        ) : (
          emails.map((email, index) => (
            <EmailMessage
              key={email.id}
              email={email}
              isLatest={index === emails.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
