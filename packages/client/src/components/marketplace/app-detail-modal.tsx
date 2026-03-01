import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../ui/modal';
import { ExternalLink, Cpu, HardDrive, Database, Trash2, Check, Loader2, AlertCircle } from 'lucide-react';
import type { CatalogApp, AtlasManifest } from '@atlasmail/shared';
import { AppIcon } from './app-icons';

interface AppDetailModalProps {
  app: CatalogApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: (app: CatalogApp) => void;
  onUninstall?: (app: CatalogApp) => void;
  isInstalled?: boolean;
  isUninstalling?: boolean;
  uninstallDone?: boolean;
}

type ModalView = 'detail' | 'confirm' | 'uninstalling';

interface UninstallStep {
  label: string;
  delayMs: number;
}

const UNINSTALL_STEPS: UninstallStep[] = [
  { label: 'Stopping application', delayMs: 1000 },
  { label: 'Removing container', delayMs: 800 },
  { label: 'Dropping database', delayMs: 1200 },
  { label: 'Cleaning up cache', delayMs: 600 },
  { label: 'Removing network routes', delayMs: 500 },
];

export function AppDetailModal({
  app,
  open,
  onOpenChange,
  onInstall,
  onUninstall,
  isInstalled,
  isUninstalling,
  uninstallDone,
}: AppDetailModalProps) {
  const [view, setView] = useState<ModalView>('detail');
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showSuccess, setShowSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setView('detail');
        setActiveStep(0);
        setCompletedSteps(new Set());
        setShowSuccess(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Advance cosmetic uninstall steps
  const advanceStep = useCallback((stepIndex: number) => {
    const step = UNINSTALL_STEPS[stepIndex];
    if (!step) {
      // All steps done — wait for real uninstall to complete or show success
      return;
    }

    setActiveStep(stepIndex);
    timerRef.current = setTimeout(() => {
      setCompletedSteps((prev) => new Set(prev).add(stepIndex));
      advanceStep(stepIndex + 1);
    }, step.delayMs);
  }, []);

  // Start uninstall animation
  useEffect(() => {
    if (view === 'uninstalling') {
      advanceStep(0);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [view, advanceStep]);

  // Show success when cosmetic steps are done AND the real uninstall has completed
  useEffect(() => {
    if (view === 'uninstalling' && completedSteps.size === UNINSTALL_STEPS.length && uninstallDone) {
      setShowSuccess(true);
    }
  }, [view, completedSteps.size, uninstallDone]);

  if (!app) return null;

  const manifest = app.manifest as AtlasManifest;

  const handleOpenChange = (value: boolean) => {
    // Don't allow closing during uninstall unless done
    if (view === 'uninstalling' && !showSuccess) return;
    onOpenChange(value);
  };

  const handleConfirmUninstall = () => {
    onUninstall?.(app);
    setView('uninstalling');
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange} width={560} title={app.name}>
      <Modal.Header
        title={view === 'uninstalling' ? `Uninstalling ${app.name}` : app.name}
        subtitle={view === 'uninstalling' ? undefined : `v${app.currentVersion} · ${app.category}`}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: app.color || '#4A90E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: view === 'uninstalling' && showSuccess ? 0.4 : 1,
              transition: 'opacity 0.5s ease',
            }}
          >
            {app.manifestId ? <AppIcon manifestId={app.manifestId} size={32} color="#fff" /> : <ExternalLink size={26} color="#fff" />}
          </div>
        </div>
      </Modal.Header>

      <Modal.Body>
        {view === 'detail' && <DetailView app={app} manifest={manifest} />}
        {view === 'confirm' && <ConfirmView app={app} />}
        {view === 'uninstalling' && (
          <UninstallProgressView
            steps={UNINSTALL_STEPS}
            activeStep={activeStep}
            completedSteps={completedSteps}
            showSuccess={showSuccess}
            appName={app.name}
          />
        )}
      </Modal.Body>

      <Modal.Footer>
        {view === 'detail' && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            {isInstalled && onUninstall && (
              <button
                onClick={() => setView('confirm')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #FFCDD2',
                  background: 'transparent',
                  color: '#D32F2F',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                  marginRight: 'auto',
                }}
              >
                <Trash2 size={14} />
                Uninstall
              </button>
            )}
            <button
              onClick={() => handleOpenChange(false)}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: '1px solid var(--color-border-primary)',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
              }}
            >
              Close
            </button>
            {!isInstalled && (
              <button
                onClick={() => onInstall(app)}
                style={{
                  padding: '8px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#13715B',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                }}
              >
                Install
              </button>
            )}
          </div>
        )}

        {view === 'confirm' && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setView('detail')}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: '1px solid var(--color-border-primary)',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmUninstall}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#D32F2F',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
              }}
            >
              Yes, uninstall
            </button>
          </div>
        )}

        {view === 'uninstalling' && showSuccess && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => handleOpenChange(false)}
              style={{
                padding: '8px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#13715B',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
              }}
            >
              Done
            </button>
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
}

// ─── Detail View ────────────────────────────────────────────────────────

function DetailView({ app, manifest }: { app: CatalogApp; manifest: AtlasManifest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{
        fontSize: 14,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {app.description}
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {app.tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 6,
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              fontWeight: 500,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 12,
        padding: 16,
        background: 'var(--color-bg-tertiary)',
        borderRadius: 10,
      }}>
        <ResourceItem icon={<Cpu size={16} />} label="CPU" value={`${manifest?.resources?.cpuMillicores ?? '?'}m`} />
        <ResourceItem icon={<HardDrive size={16} />} label="Memory" value={`${manifest?.resources?.memoryMb ?? '?'} MB`} />
        <ResourceItem icon={<Database size={16} />} label="Storage" value={`${manifest?.resources?.storageMb ?? '?'} MB`} />
      </div>

      {manifest?.addons && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Required services
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {manifest.addons.postgresql && <AddonBadge label="PostgreSQL" />}
            {manifest.addons.redis && <AddonBadge label="Redis" />}
            {manifest.addons.smtp && <AddonBadge label="SMTP" />}
            {manifest.addons.s3 && <AddonBadge label="S3" />}
          </div>
        </div>
      )}

      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
        Minimum plan: <strong style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{app.minPlan}</strong>
      </div>
    </div>
  );
}

// ─── Confirm View ───────────────────────────────────────────────────────

function ConfirmView({ app }: { app: CatalogApp }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        padding: 14,
        background: '#FFF3F3',
        borderRadius: 8,
        fontSize: 13,
        color: '#D32F2F',
        lineHeight: 1.6,
      }}>
        This will permanently remove <strong>{app.name}</strong> and all its data including databases, files, and configuration. This action cannot be undone.
      </div>
      <div style={{
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.5,
      }}>
        The following will be deleted:
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>Application container and runtime</li>
          {app.manifest?.addons?.postgresql && <li>PostgreSQL database and user</li>}
          {app.manifest?.addons?.redis && <li>Redis cache data</li>}
          <li>Network routes and configuration</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Uninstall Progress View ────────────────────────────────────────────

function UninstallProgressView({
  steps,
  activeStep,
  completedSteps,
  showSuccess,
  appName,
}: {
  steps: UninstallStep[];
  activeStep: number;
  completedSteps: Set<number>;
  showSuccess: boolean;
  appName: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {steps.map((step, i) => {
          const isDone = completedSteps.has(i);
          const isActive = activeStep === i && !isDone;
          const isPending = i > activeStep;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                background: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                transition: 'all 0.3s ease',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isDone
                    ? '#FFEBEE'
                    : isActive
                      ? 'var(--color-bg-quaternary)'
                      : 'transparent',
                  border: isPending ? '1.5px solid var(--color-border-primary)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {isDone && <Check size={14} color="#D32F2F" strokeWidth={3} />}
                {isActive && (
                  <Loader2 size={14} color="var(--color-text-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                )}
              </div>
              <span
                style={{
                  fontSize: 14,
                  color: isDone
                    ? '#D32F2F'
                    : isActive
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-tertiary)',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all 0.3s ease',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {showSuccess && (
        <div
          style={{
            marginTop: 4,
            padding: 14,
            background: '#FFF3F3',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            color: '#D32F2F',
            fontWeight: 500,
            fontFamily: 'var(--font-family)',
          }}
        >
          <Trash2 size={16} />
          {appName} has been completely removed.
        </div>
      )}
    </div>
  );
}

// ─── Shared components ──────────────────────────────────────────────────

function ResourceItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ color: 'var(--color-text-tertiary)' }}>{icon}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

function AddonBadge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 12,
      padding: '4px 10px',
      borderRadius: 6,
      background: 'var(--color-bg-quaternary)',
      color: 'var(--color-text-secondary)',
      fontWeight: 500,
      border: '1px solid var(--color-border-primary)',
    }}>
      {label}
    </span>
  );
}
