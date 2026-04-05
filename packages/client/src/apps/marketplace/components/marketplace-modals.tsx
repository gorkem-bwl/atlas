import { useState, type CSSProperties } from 'react';
import {
  AlertTriangle,
  Loader2,
  Trash2,
  Download,
  Info,
} from 'lucide-react';
import type { MarketplaceCatalogItem } from '@atlasmail/shared';
import { Button } from '../../../components/ui/button';
import { Modal } from '../../../components/ui/modal';
import { Skeleton } from '../../../components/ui/skeleton';
import { InfoRow } from './marketplace-helpers';
import { useMarketplaceLogs } from '../hooks';

// ─── Deploy Confirm Modal ─────────────────────────────────────────

export function DeployConfirmModal({
  app,
  open,
  onOpenChange,
  onConfirm,
  isDeploying,
  t,
}: {
  app: MarketplaceCatalogItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeploying: boolean;
  t: (key: string, opts?: Record<string, string>) => string;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} width={460} title={t('marketplace.deployConfirmTitle')}>
      <Modal.Header title={t('marketplace.deployConfirmTitle')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-md)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family)',
              lineHeight: 'var(--line-height-normal)',
            }}
          >
            {t('marketplace.deployConfirmDesc', { name: app.name })}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-lg)',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-secondary)',
            }}
          >
            <InfoRow label={t('marketplace.ram')} value={app.resources.minRam} />
            <InfoRow label={t('marketplace.disk')} value={app.resources.estimatedDisk} />
            <InfoRow label={t('marketplace.license')} value={app.license} />
            <InfoRow label={t('marketplace.category')} value={app.category} />
          </div>

          {app.defaultCredentials && (
            <div
              style={{
                padding: 'var(--spacing-md)',
                background: 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                <Info size={14} style={{ color: 'var(--color-warning)' }} />
                <span
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-family)',
                  }}
                >
                  {t('marketplace.defaultCredentials')}
                </span>
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-family-mono, monospace)',
                }}
              >
                {app.defaultCredentials.username} / {app.defaultCredentials.password}
              </div>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={isDeploying}
          icon={isDeploying ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
        >
          {isDeploying ? t('marketplace.statusInstalling') : t('marketplace.deploy')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Remove Confirm Modal ─────────────────────────────────────────

export function RemoveConfirmModal({
  app,
  open,
  onOpenChange,
  onConfirm,
  isRemoving,
  t,
}: {
  app: MarketplaceCatalogItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isRemoving: boolean;
  t: (key: string, opts?: Record<string, string>) => string;
}) {
  const [typedName, setTypedName] = useState('');
  const canConfirm = typedName.toLowerCase() === app.name.toLowerCase();

  return (
    <Modal open={open} onOpenChange={(v) => { setTypedName(''); onOpenChange(v); }} width={460} title={t('marketplace.removeConfirmTitle')}>
      <Modal.Header title={t('marketplace.removeConfirmTitle')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-lg)',
                background: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--font-size-md)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)',
                lineHeight: 'var(--line-height-normal)',
              }}
            >
              {t('marketplace.removeConfirmDesc', { name: app.name })}
            </p>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)',
                marginBottom: 'var(--spacing-xs)',
              }}
            >
              {t('marketplace.typeNameToConfirm', { name: app.name })}
            </label>
            <input
              type="text"
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              placeholder={app.name}
              style={{
                width: '100%',
                height: 34,
                padding: '0 var(--spacing-md)',
                fontSize: 'var(--font-size-md)',
                fontFamily: 'var(--font-family)',
                color: 'var(--color-text-primary)',
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => { setTypedName(''); onOpenChange(false); }}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={!canConfirm || isRemoving}
          icon={isRemoving ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
        >
          {t('marketplace.remove')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Logs Modal ───────────────────────────────────────────────────

export function LogsModal({
  appId,
  appName,
  open,
  onOpenChange,
  t,
}: {
  appId: string;
  appName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string;
}) {
  const { data, isLoading } = useMarketplaceLogs(appId, open);

  return (
    <Modal open={open} onOpenChange={onOpenChange} width={700} height="70vh" title={`${t('marketplace.logs')} - ${appName}`}>
      <Modal.Header title={`${t('marketplace.logs')} - ${appName}`} />
      <Modal.Body padding="0">
        {isLoading ? (
          <div style={{ padding: 'var(--spacing-xl)' }}>
            <Skeleton width="100%" height={200} />
          </div>
        ) : (
          <pre
            style={{
              margin: 0,
              padding: 'var(--spacing-lg)',
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-family-mono, monospace)',
              color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              overflow: 'auto',
              height: '100%',
              background: 'var(--color-bg-secondary)',
            }}
          >
            {data?.logs || t('marketplace.noLogs')}
          </pre>
        )}
      </Modal.Body>
    </Modal>
  );
}
