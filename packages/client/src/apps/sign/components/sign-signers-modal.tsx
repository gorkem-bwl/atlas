import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Modal } from '../../../components/ui/modal';
import { StatusDot } from '../../../components/ui/status-dot';
import { SIGNER_COLORS } from './signer-panel';

interface SigningLink {
  id: string;
  signerEmail: string;
  signerName: string | null;
  status: string;
}

export function SignSignersModal({
  open,
  onOpenChange,
  signingLinks,
  activeSigner,
  onActiveSignerChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signingLinks: SigningLink[] | undefined;
  activeSigner: string | undefined;
  onActiveSignerChange: (email: string | undefined) => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onOpenChange={onOpenChange} width={480} title={t('sign.signers.manageSigners')}>
      <Modal.Header title={t('sign.signers.manageSigners')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: 4,
            }}
          >
            {t('sign.signers.assignFieldsDesc')}
          </div>
          {signingLinks && signingLinks.length > 0 ? (
            signingLinks.map((link, idx) => (
              <div
                key={link.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${activeSigner === link.signerEmail ? SIGNER_COLORS[idx % SIGNER_COLORS.length] : 'var(--color-border-primary)'}`,
                  background: activeSigner === link.signerEmail ? `${SIGNER_COLORS[idx % SIGNER_COLORS.length]}10` : 'transparent',
                  cursor: 'pointer',
                }}
                onClick={() => onActiveSignerChange(activeSigner === link.signerEmail ? undefined : link.signerEmail)}
              >
                <StatusDot color={SIGNER_COLORS[idx % SIGNER_COLORS.length]} size={10} />
                <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                  {link.signerName || link.signerEmail}
                </span>
                <Badge variant={link.status === 'signed' ? 'success' : link.status === 'expired' || link.status === 'declined' ? 'error' : 'warning'}>
                  {link.status}
                </Badge>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', padding: '12px 0' }}>
              {t('sign.signers.noSignersYet')}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {t('common.close')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
