import { useState } from 'react';
import { ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { formatFullDate, formatRelativeTime } from '@atlasmail/shared';
import type { Email } from '@atlasmail/shared';
import type { CSSProperties } from 'react';

// SECURITY NOTE: Email HTML bodies must be sanitized before rendering to prevent XSS.
// Import and use DOMPurify in production:
//   import DOMPurify from 'dompurify';
//   const safeHtml = DOMPurify.sanitize(email.bodyHtml, { USE_PROFILES: { html: true } });
// This component currently renders text content only for safety.

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SafeEmailBody({ bodyHtml, bodyText }: { bodyHtml: string | null; bodyText: string | null }) {
  if (bodyText) {
    return (
      <pre
        style={{
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-text-primary)',
          lineHeight: 'var(--line-height-normal)',
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--font-family)',
          margin: 0,
          overflowWrap: 'break-word',
        }}
      >
        {bodyText}
      </pre>
    );
  }

  if (bodyHtml) {
    // Strip HTML tags for safe text-only rendering until DOMPurify is wired up
    const textContent = bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return (
      <pre
        style={{
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-text-primary)',
          lineHeight: 'var(--line-height-normal)',
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--font-family)',
          margin: 0,
          overflowWrap: 'break-word',
        }}
      >
        {textContent}
      </pre>
    );
  }

  return (
    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-md)', margin: 0 }}>
      (no content)
    </p>
  );
}

interface EmailMessageProps {
  email: Email;
  isLatest?: boolean;
}

export function EmailMessage({ email, isLatest = false }: EmailMessageProps) {
  const [expanded, setExpanded] = useState(isLatest);

  const senderName = email.fromName || email.fromAddress;
  const recipientList = email.toAddresses.map((a) => a.name || a.address).join(', ');
  const ccList = email.ccAddresses.map((a) => a.name || a.address).join(', ');

  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-border-primary)',
        background: 'var(--color-bg-primary)',
      }}
    >
      {/* Message header — clickable to expand/collapse */}
      <div
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--spacing-md)',
          padding: 'var(--spacing-lg)',
          cursor: 'pointer',
          transition: 'background var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          if (!expanded) e.currentTarget.style.background = 'var(--color-surface-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Avatar name={email.fromName} email={email.fromAddress} size={36} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--spacing-sm)',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
              }}
            >
              {senderName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              {email.attachments.length > 0 && (
                <Paperclip size={13} style={{ color: 'var(--color-text-tertiary)' }} />
              )}
              <span
                title={formatFullDate(email.receivedAt || email.internalDate)}
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                {formatRelativeTime(email.receivedAt || email.internalDate)}
              </span>
              {expanded ? (
                <ChevronUp size={14} style={{ color: 'var(--color-text-tertiary)' }} />
              ) : (
                <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
              )}
            </div>
          </div>

          {expanded ? (
            <div
              style={{
                marginTop: 'var(--spacing-xs)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              <span>To: {recipientList || '(no recipients)'}</span>
              {ccList && <span style={{ marginLeft: 'var(--spacing-sm)' }}>CC: {ccList}</span>}
            </div>
          ) : (
            <div
              style={{
                marginTop: '2px',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {email.snippet || email.bodyText?.slice(0, 120) || ''}
            </div>
          )}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 var(--spacing-lg) var(--spacing-lg)' }}>
          <div style={{ marginLeft: `calc(36px + var(--spacing-md))` }}>
            <SafeEmailBody bodyHtml={email.bodyHtml} bodyText={email.bodyText} />

            {/* Attachments */}
            {email.attachments.filter((a) => !a.isInline).length > 0 && (
              <div
                style={{
                  marginTop: 'var(--spacing-lg)',
                  paddingTop: 'var(--spacing-md)',
                  borderTop: '1px solid var(--color-border-primary)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--spacing-sm)',
                }}
              >
                {email.attachments
                  .filter((a) => !a.isInline)
                  .map((attachment) => (
                    <div
                      key={attachment.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border-primary)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                      }}
                    >
                      <Paperclip size={13} style={{ color: 'var(--color-text-tertiary)' }} />
                      <div>
                        <div
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-primary)',
                            fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
                          }}
                        >
                          {attachment.filename}
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-tertiary)',
                          }}
                        >
                          {formatBytes(attachment.size || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
