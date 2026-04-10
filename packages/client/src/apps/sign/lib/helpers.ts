import type { SignAuditLogEntry } from '@atlas-platform/shared';

// ─── Status helpers ─────────────────────────────────────────────────

export type FilterStatus = 'all' | 'pending' | 'signed' | 'draft' | 'expired' | 'voided';

export const STATUS_BADGE_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  pending: 'warning',
  signed: 'success',
  expired: 'error',
  voided: 'error',
};

// Status-based left border colors for document list rows
export const STATUS_BORDER_COLORS: Record<string, string> = {
  signed: 'var(--color-success)',
  pending: 'var(--color-warning)',
  draft: 'var(--color-border-primary)',
  expired: 'var(--color-error)',
  voided: 'var(--color-error)',
};

// ─── Audit action label helper ──────────────────────────────────────

export function getAuditActionLabel(entry: SignAuditLogEntry, t: (key: string, opts?: Record<string, unknown>) => string): string {
  switch (entry.action) {
    case 'document.created':
      return t('sign.audit.documentCreated');
    case 'signing_link.created':
      return t('sign.audit.linkCreated', { email: entry.actorEmail ?? '' });
    case 'document.viewed':
      return t('sign.audit.documentViewed', { email: entry.actorEmail ?? '' });
    case 'document.signed':
      return t('sign.audit.fieldSigned', { email: entry.actorEmail ?? '' });
    case 'document.completed':
      return t('sign.audit.documentCompleted');
    case 'document.voided':
      return t('sign.audit.documentVoided');
    case 'document.declined':
      return t('sign.audit.documentDeclined', { email: entry.actorEmail ?? '' });
    case 'signing_token.completed':
      return t('sign.audit.fieldSigned', { email: entry.actorEmail ?? '' });
    default:
      return entry.action;
  }
}

export function getDefaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}
