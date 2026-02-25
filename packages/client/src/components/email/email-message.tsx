import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { ChevronDown, ChevronUp, Paperclip, FileText, Image as ImageIcon, Download, File } from 'lucide-react';
import { Avatar } from '../ui/avatar';
import { TrackingStats } from './tracking-stats';
import { formatFullDate, formatRelativeTime } from '@atlasmail/shared';
import { formatBytes } from '../../lib/format';
import { injectThreadExpand } from '../../lib/animations';
import { useSettingsStore } from '../../stores/settings-store';
import { config } from '../../config/env';
import type { Email, Attachment, EmailTrackingRecord, TrackingEvent } from '@atlasmail/shared';
import type { CSSProperties } from 'react';

injectThreadExpand();

// Configure DOMPurify: allow safe HTML, strip dangerous elements
// USE_PROFILES: { html: true } already strips all event handler attributes
const PURIFY_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['style', 'form', 'input', 'script'],
};

// Force all links to open in new tab
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function separateQuotedContent(html: string): { main: string; quoted: string | null } {
  // Gmail-style quoted blocks
  const gmailQuoteMatch = html.match(/<div[^>]*class="gmail_quote"[^>]*>[\s\S]*$/i);
  if (gmailQuoteMatch) {
    return {
      main: html.slice(0, gmailQuoteMatch.index!),
      quoted: html.slice(gmailQuoteMatch.index!),
    };
  }

  // Blockquote at the end
  const blockquoteMatch = html.match(/<blockquote[^>]*>[\s\S]*$/i);
  if (blockquoteMatch) {
    return {
      main: html.slice(0, blockquoteMatch.index!),
      quoted: html.slice(blockquoteMatch.index!),
    };
  }

  // "On ... wrote:" pattern
  const onWroteMatch = html.match(/<(?:div|p|br)[^>]*>(?:\s|&nbsp;)*On .+? wrote:[\s\S]*$/i);
  if (onWroteMatch) {
    return {
      main: html.slice(0, onWroteMatch.index!),
      quoted: html.slice(onWroteMatch.index!),
    };
  }

  return { main: html, quoted: null };
}

function separateQuotedText(text: string): { main: string; quoted: string | null } {
  const lines = text.split('\n');

  // Find "On ... wrote:" line
  for (let i = 0; i < lines.length; i++) {
    if (/^On .+? wrote:$/.test(lines[i].trim())) {
      return {
        main: lines.slice(0, i).join('\n').trimEnd(),
        quoted: lines.slice(i).join('\n'),
      };
    }
  }

  // Find block of "> " prefixed lines (3+ consecutive)
  let consecutiveQuoted = 0;
  let quoteStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('> ') || lines[i] === '>') {
      if (consecutiveQuoted === 0) quoteStartIndex = i;
      consecutiveQuoted++;
      if (consecutiveQuoted >= 3) {
        return {
          main: lines.slice(0, quoteStartIndex).join('\n').trimEnd(),
          quoted: lines.slice(quoteStartIndex).join('\n'),
        };
      }
    } else {
      consecutiveQuoted = 0;
      quoteStartIndex = -1;
    }
  }

  return { main: text, quoted: null };
}

const textBodyStyle: CSSProperties = {
  fontSize: 'var(--font-size-md)',
  color: 'var(--color-text-primary)',
  lineHeight: 'var(--line-height-normal)',
  whiteSpace: 'pre-wrap',
  fontFamily: 'var(--font-family)',
  margin: 0,
  overflowWrap: 'break-word',
};

const emailHtmlBodyStyle: CSSProperties = {
  fontSize: 'var(--font-size-md)',
  lineHeight: 'var(--line-height-normal)',
  fontFamily: 'var(--font-family)',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
};

const quotedToggleStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: 'var(--spacing-sm) 0',
  padding: '2px var(--spacing-sm)',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-tertiary)',
  background: 'var(--color-bg-tertiary)',
  border: '1px solid var(--color-border-primary)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
  letterSpacing: '1px',
};

// ---------------------------------------------------------------------------
// Attachment helpers
// ---------------------------------------------------------------------------

function getAttachmentIcon(mimeType: string): typeof File {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType === 'application/pdf') return FileText;
  if (
    mimeType === 'application/msword' ||
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('spreadsheetml') ||
    mimeType.includes('presentationml') ||
    mimeType.includes('opendocument')
  ) {
    return FileText;
  }
  return File;
}

function getAttachmentUrl(attachmentId: string): string {
  const token = localStorage.getItem('atlasmail_token');
  return `${config.apiUrl}/threads/attachments/${attachmentId}?token=${encodeURIComponent(token || '')}`;
}

function AttachmentCard({ attachment }: { attachment: Attachment }) {
  const { t } = useTranslation();
  const isImage = attachment.mimeType.startsWith('image/');
  const Icon = getAttachmentIcon(attachment.mimeType);
  const downloadUrl = getAttachmentUrl(attachment.id);
  const [imgError, setImgError] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    // Open the attachment URL — the server's Content-Disposition header controls
    // whether the browser previews (inline) or downloads (attachment) the file.
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: isImage ? 140 : 'auto',
        maxWidth: isImage ? 140 : 220,
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Image thumbnail — real preview for images */}
      {isImage ? (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '100%',
            height: 80,
            background: 'var(--color-bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {!imgError ? (
            <img
              src={downloadUrl}
              alt={attachment.filename}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <ImageIcon
              size={28}
              style={{ color: 'var(--color-text-tertiary)', opacity: 0.5 }}
            />
          )}
        </a>
      ) : null}

      {/* File info row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-sm) var(--spacing-sm)',
        }}
      >
        <Icon
          size={15}
          style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-primary)',
              fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={attachment.filename}
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
        <a
          href={downloadUrl}
          aria-label={t('email.download', { filename: attachment.filename })}
          onClick={handleDownload}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-tertiary)',
            flexShrink: 0,
            textDecoration: 'none',
            transition: 'color var(--transition-normal), background var(--transition-normal)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-primary)';
            (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-surface-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-tertiary)';
            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
          }}
        >
          <Download size={13} />
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email body renderer
// ---------------------------------------------------------------------------

function SafeEmailBody({ bodyHtml, bodyText }: { bodyHtml: string | null; bodyText: string | null }) {
  const { t } = useTranslation();
  const [showQuoted, setShowQuoted] = useState(false);
  const theme = useSettingsStore((s) => s.theme);

  // Detect effective dark mode: explicit dark setting, or system preference
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  // External HTML emails assume a white background. In dark mode, force a
  // light container so sender-authored colors remain legible (same approach
  // as Gmail, Outlook, and Apple Mail).
  const htmlWrapperStyle: CSSProperties = isDark
    ? {
        background: '#ffffff',
        color: '#1a1a1a',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-md)',
        margin: 'var(--spacing-xs) 0',
      }
    : {};

  // Prefer HTML rendering when available
  if (bodyHtml) {
    const sanitized = DOMPurify.sanitize(bodyHtml, PURIFY_CONFIG);
    const { main, quoted } = separateQuotedContent(sanitized);

    return (
      <div>
        <div style={htmlWrapperStyle}>
          <div
            className="email-html-body"
            style={emailHtmlBodyStyle}
            dangerouslySetInnerHTML={{ __html: main }}
          />
        </div>
        {quoted && (
          <>
            <button onClick={() => setShowQuoted(!showQuoted)} style={quotedToggleStyle}>
              {showQuoted ? t('email.hideQuotedText') : '\u2026'}
            </button>
            <div style={htmlWrapperStyle}>
              {showQuoted && (
                <div
                  className="email-html-body"
                  style={{ ...emailHtmlBodyStyle, opacity: 0.7 }}
                  dangerouslySetInnerHTML={{ __html: quoted }}
                />
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (bodyText) {
    const { main, quoted } = separateQuotedText(bodyText);

    return (
      <div>
        <pre style={textBodyStyle}>{main}</pre>
        {quoted && (
          <>
            <button onClick={() => setShowQuoted(!showQuoted)} style={quotedToggleStyle}>
              {showQuoted ? t('email.hideQuotedText') : '\u2026'}
            </button>
            {showQuoted && (
              <pre style={{ ...textBodyStyle, opacity: 0.7 }}>{quoted}</pre>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-md)', margin: 0 }}>
      {t('common.noContent')}
    </p>
  );
}

interface EmailMessageProps {
  email: Email;
  isLatest?: boolean;
  /** When provided, expand/collapse is controlled externally by the parent */
  isExpanded?: boolean;
  /** Called when the user clicks the header to toggle expand/collapse */
  onToggleExpand?: () => void;
  /** Tracking record for this email (only for sent emails with tracking) */
  trackingRecord?: EmailTrackingRecord | null;
  /** All tracking events for the thread */
  trackingEvents?: TrackingEvent[];
}

export function EmailMessage({
  email,
  isLatest = false,
  isExpanded,
  onToggleExpand,
  trackingRecord,
  trackingEvents: events = [],
}: EmailMessageProps) {
  const { t } = useTranslation();
  const animationsEnabled = useSettingsStore((s) => s.sendAnimation);
  // Fall back to internal state when the parent doesn't control expand state
  const [internalExpanded, setInternalExpanded] = useState(isLatest);
  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded;
  const toggleExpanded = onToggleExpand ?? (() => setInternalExpanded((v) => !v));

  // Track user-initiated expansions to animate (skip initial render)
  const hasRendered = useRef(false);
  const [shouldAnimateExpand, setShouldAnimateExpand] = useState(false);
  useEffect(() => {
    if (!hasRendered.current) {
      hasRendered.current = true;
      return;
    }
    if (expanded && animationsEnabled) {
      setShouldAnimateExpand(true);
      const timer = setTimeout(() => setShouldAnimateExpand(false), 350);
      return () => clearTimeout(timer);
    }
  }, [expanded, animationsEnabled]);

  const senderName = email.fromName || email.fromAddress;
  const emailAttachments = email.attachments ?? [];
  const toAddresses = email.toAddresses ?? [];
  const ccAddresses = email.ccAddresses ?? [];
  const recipientList = toAddresses.map((a) => a.name || a.address).join(', ');
  const ccList = ccAddresses.map((a) => a.name || a.address).join(', ');

  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-border-primary)',
        background: 'var(--color-bg-primary)',
        // Smooth height transition when expanding/collapsing
        transition: 'background var(--transition-normal)',
      }}
    >
      {/* Message header — clickable to expand/collapse */}
      <div
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => e.key === 'Enter' && toggleExpanded()}
        style={{
          display: 'flex',
          alignItems: expanded ? 'flex-start' : 'center',
          gap: 'var(--spacing-md)',
          // Taller row when collapsed for comfortable readability, normal padding when expanded
          padding: expanded ? 'var(--spacing-lg)' : 'var(--spacing-sm) var(--spacing-lg)',
          minHeight: expanded ? undefined : 52,
          cursor: 'pointer',
          transition: 'background var(--transition-normal), min-height var(--transition-normal), padding var(--transition-normal)',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!expanded) e.currentTarget.style.background = 'var(--color-surface-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Avatar name={email.fromName} email={email.fromAddress} size={32} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--spacing-sm)',
              flexWrap: expanded ? 'wrap' : 'nowrap',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {senderName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexShrink: 0 }}>
              {emailAttachments.length > 0 && (
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
            /* Collapsed snippet — single line, truncated */
            <div
              style={{
                marginTop: 1,
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

      {/* Expanded body — rendered only when open */}
      {expanded && (
        <div style={{
          padding: '0 var(--spacing-lg) var(--spacing-lg)',
          animation: shouldAnimateExpand ? 'atlasmail-thread-expand 300ms ease both' : undefined,
          overflow: 'hidden',
        }}>
          {/* Subtle separator between header section and body */}
          <div
            aria-hidden="true"
            style={{
              height: '1px',
              background: 'var(--color-border-secondary)',
              margin: 'var(--spacing-sm) 0',
            }}
          />
          <div style={{ marginLeft: `calc(36px + var(--spacing-md))` }}>
            <SafeEmailBody bodyHtml={email.bodyHtml} bodyText={email.bodyText} />

            {/* Read receipt / link tracking stats */}
            {trackingRecord && (trackingRecord.openCount > 0 || trackingRecord.clickCount > 0) && (
              <TrackingStats record={trackingRecord} events={events} />
            )}

            {/* Attachments */}
            {emailAttachments.filter((a) => !a.isInline).length > 0 && (
              <div
                style={{
                  marginTop: 'var(--spacing-lg)',
                  paddingTop: 'var(--spacing-md)',
                  borderTop: '1px solid var(--color-border-primary)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    marginBottom: 'var(--spacing-sm)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-family)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <Paperclip size={11} />
                  {t('common.attachment', { count: emailAttachments.filter((a) => !a.isInline).length })}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-sm)',
                  }}
                >
                  {emailAttachments
                    .filter((a) => !a.isInline)
                    .map((attachment) => (
                      <AttachmentCard key={attachment.id} attachment={attachment} />
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
