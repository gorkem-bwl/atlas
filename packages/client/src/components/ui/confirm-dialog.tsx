import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from './modal';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm');
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} width={440} zIndex={300} title={title}>
      <Modal.Header title={title} />
      <Modal.Body padding="var(--spacing-xl)">
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-lg)',
              background: destructive
                ? 'color-mix(in srgb, var(--color-error) 12%, transparent)'
                : 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle
              size={18}
              style={{
                color: destructive ? 'var(--color-error)' : 'var(--color-warning)',
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 'var(--font-size-md)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family)',
              lineHeight: 'var(--line-height-normal)',
            }}
          >
            {description}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {resolvedCancelLabel}
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={handleConfirm}>
          {resolvedConfirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
