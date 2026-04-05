import { useTranslation } from 'react-i18next';
import {
  FileText,
  Link2,
  PenTool,
  CheckCircle,
  Ban,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { formatDate } from '../../../lib/format';
import { getAuditActionLabel } from '../lib/helpers';
import type { SignAuditLogEntry } from '@atlasmail/shared';

export function SignAuditView({
  auditEntries,
  onBack,
}: {
  auditEntries: SignAuditLogEntry[] | undefined;
  onBack: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onBack}>
          {t('sign.editor.back')}
        </Button>
      </div>
      {!auditEntries || auditEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          {t('sign.audit.noEvents')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 640 }}>
          {auditEntries.map((entry, idx) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md) 0',
                borderBottom: idx < auditEntries.length - 1 ? '1px solid var(--color-border-secondary)' : undefined,
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--color-bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {entry.action === 'document.created' && <FileText size={13} style={{ color: '#8b5cf6' }} />}
                {entry.action === 'signing_link.created' && <Link2 size={13} style={{ color: '#f59e0b' }} />}
                {entry.action === 'document.viewed' && <FileText size={13} style={{ color: '#6b7280' }} />}
                {entry.action === 'document.signed' && <PenTool size={13} style={{ color: '#10b981' }} />}
                {entry.action === 'signing_token.completed' && <CheckCircle size={13} style={{ color: '#10b981' }} />}
                {entry.action === 'document.completed' && <CheckCircle size={13} style={{ color: '#10b981' }} />}
                {entry.action === 'document.voided' && <Ban size={13} style={{ color: '#ef4444' }} />}
                {entry.action === 'document.declined' && <AlertTriangle size={13} style={{ color: '#ef4444' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                  {getAuditActionLabel(entry, t)}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {formatDate(entry.createdAt)}
                  {entry.actorEmail && (
                    <span> &middot; {entry.actorEmail}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
