import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../ui/modal';
import { Check, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import type { CatalogApp } from '@atlasmail/shared';

interface InstallConfirmModalProps {
  app: CatalogApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (subdomain: string) => void;
  isLoading?: boolean;
  tenantSlug?: string;
  installationStatus?: string;
  onDone?: () => void;
}

type ModalView = 'form' | 'deploying';

interface DeployStep {
  label: string;
  delayMs: number;
  isRealCheck?: boolean;
}

const DEPLOY_STEPS: DeployStep[] = [
  { label: 'Provisioning database', delayMs: 1200 },
  { label: 'Setting up cache', delayMs: 800 },
  { label: 'Pulling container image', delayMs: 2000 },
  { label: 'Starting application', delayMs: 1500 },
  { label: 'Verifying health', delayMs: 0, isRealCheck: true },
];

export function InstallConfirmModal({
  app,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  tenantSlug,
  installationStatus,
  onDone,
}: InstallConfirmModalProps) {
  const [subdomain, setSubdomain] = useState('');
  const [view, setView] = useState<ModalView>('form');
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [deployError, setDeployError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subdomainRef = useRef('');

  // Reset state when app changes or modal closes
  useEffect(() => {
    if (!open) {
      // Delay reset so close animation finishes
      const t = setTimeout(() => {
        setView('form');
        setActiveStep(0);
        setCompletedSteps(new Set());
        setDeployError(false);
        setSubdomain('');
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setSubdomain('');
  }, [app?.id]);

  // Advance cosmetic steps with timed delays
  const advanceStep = useCallback((stepIndex: number) => {
    const step = DEPLOY_STEPS[stepIndex];
    if (!step) return;

    setActiveStep(stepIndex);

    if (!step.isRealCheck && step.delayMs > 0) {
      timerRef.current = setTimeout(() => {
        setCompletedSteps((prev) => new Set(prev).add(stepIndex));
        advanceStep(stepIndex + 1);
      }, step.delayMs);
    }
    // isRealCheck steps are advanced by the installationStatus effect
  }, []);

  // Start deploy animation when switching to deploying view
  useEffect(() => {
    if (view === 'deploying') {
      advanceStep(0);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [view, advanceStep]);

  // Handle real status check (step 5)
  useEffect(() => {
    if (view !== 'deploying') return;
    const lastIdx = DEPLOY_STEPS.length - 1;

    if (activeStep === lastIdx && DEPLOY_STEPS[lastIdx].isRealCheck) {
      if (installationStatus === 'running') {
        setCompletedSteps((prev) => new Set(prev).add(lastIdx));
      } else if (installationStatus === 'error') {
        setDeployError(true);
      }
    }
  }, [installationStatus, activeStep, view]);

  if (!app) return null;

  const defaultSubdomain = app.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  const handleConfirm = () => {
    const sub = subdomain || defaultSubdomain;
    subdomainRef.current = sub;
    onConfirm(sub);
    setView('deploying');
  };

  const isDev = window.location.hostname === 'localhost';
  const domain = isDev ? 'localhost' : 'atlas.so';
  const previewUrl = `${subdomain || defaultSubdomain}.${tenantSlug || 'your-org'}.${domain}`;
  const allDone = completedSteps.size === DEPLOY_STEPS.length;

  const handleClose = () => {
    onOpenChange(false);
    if (allDone) onDone?.();
  };

  return (
    <Modal
      open={open}
      onOpenChange={view === 'deploying' && !allDone && !deployError ? () => {} : handleClose}
      width={460}
      title={view === 'form' ? `Install ${app.name}` : `Deploying ${app.name}`}
    >
      <Modal.Header title={view === 'form' ? `Install ${app.name}` : `Deploying ${app.name}`} />

      <Modal.Body>
        {view === 'form' ? (
          <FormView
            app={app}
            subdomain={subdomain}
            setSubdomain={setSubdomain}
            defaultSubdomain={defaultSubdomain}
            previewUrl={previewUrl}
          />
        ) : (
          <DeployView
            steps={DEPLOY_STEPS}
            activeStep={activeStep}
            completedSteps={completedSteps}
            deployError={deployError}
            allDone={allDone}
            previewUrl={previewUrl}
          />
        )}
      </Modal.Body>

      <Modal.Footer>
        {view === 'form' ? (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
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
              onClick={handleConfirm}
              disabled={isLoading}
              style={{
                padding: '8px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#13715B',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                fontFamily: 'var(--font-family)',
              }}
            >
              Confirm install
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {allDone && (
              <>
                <button
                  onClick={handleClose}
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
                <a
                  href={`${isDev ? 'http' : 'https'}://${previewUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#13715B',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontFamily: 'var(--font-family)',
                  }}
                >
                  Open app
                  <ExternalLink size={14} />
                </a>
              </>
            )}
            {deployError && (
              <button
                onClick={() => {
                  setDeployError(false);
                  setView('form');
                  setActiveStep(0);
                  setCompletedSteps(new Set());
                }}
                style={{
                  padding: '8px 20px',
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
                Try again
              </button>
            )}
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
}

// ─── Form View ──────────────────────────────────────────────────────────

function FormView({
  app,
  subdomain,
  setSubdomain,
  defaultSubdomain,
  previewUrl,
}: {
  app: CatalogApp;
  subdomain: string;
  setSubdomain: (v: string) => void;
  defaultSubdomain: string;
  previewUrl: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            marginBottom: 6,
          }}
        >
          Subdomain
        </label>
        <input
          type="text"
          placeholder={defaultSubdomain}
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-border-primary)',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'var(--font-family)',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{
        padding: 12,
        background: 'var(--color-bg-tertiary)',
        borderRadius: 8,
        fontSize: 13,
        color: 'var(--color-text-secondary)',
      }}>
        Your app will be available at:<br />
        <strong style={{ color: 'var(--color-text-primary)' }}>https://{previewUrl}</strong>
      </div>

      <div style={{
        fontSize: 12,
        color: 'var(--color-text-tertiary)',
        lineHeight: 1.5,
      }}>
        This will provision a dedicated instance of {app.name} for your organization.
        {app.manifest?.addons?.postgresql && ' A PostgreSQL database will be automatically created.'}
        {app.manifest?.addons?.redis && ' A Redis cache will be provisioned.'}
      </div>
    </div>
  );
}

// ─── Deploy View ────────────────────────────────────────────────────────

function DeployView({
  steps,
  activeStep,
  completedSteps,
  deployError,
  allDone,
  previewUrl,
}: {
  steps: DeployStep[];
  activeStep: number;
  completedSteps: Set<number>;
  deployError: boolean;
  allDone: boolean;
  previewUrl: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Step list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {steps.map((step, i) => {
          const isDone = completedSteps.has(i);
          const isActive = activeStep === i && !isDone;
          const isErrorStep = isActive && deployError;
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
              {/* Step indicator */}
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
                    ? '#E8F5E9'
                    : isErrorStep
                      ? '#FFEBEE'
                      : isActive
                        ? 'var(--color-bg-quaternary)'
                        : 'transparent',
                  border: isPending ? '1.5px solid var(--color-border-primary)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {isDone && <Check size={14} color="#2E7D32" strokeWidth={3} />}
                {isActive && !isErrorStep && (
                  <Loader2 size={14} color="var(--color-text-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
                )}
                {isErrorStep && <AlertCircle size={14} color="#D32F2F" />}
              </div>

              {/* Step label */}
              <span
                style={{
                  fontSize: 14,
                  color: isDone
                    ? '#2E7D32'
                    : isErrorStep
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
                {isErrorStep && ' — failed'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Success banner */}
      {allDone && (
        <div
          style={{
            marginTop: 4,
            padding: 14,
            background: '#E8F5E9',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            color: '#2E7D32',
            fontWeight: 500,
            fontFamily: 'var(--font-family)',
          }}
        >
          <Check size={18} strokeWidth={3} />
          Deployment complete! Your app is live at{' '}
          <strong>{previewUrl}</strong>
        </div>
      )}

      {/* Error banner */}
      {deployError && (
        <div
          style={{
            marginTop: 4,
            padding: 14,
            background: '#FFEBEE',
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
          <AlertCircle size={18} />
          Deployment failed. Please try again or contact support.
        </div>
      )}
    </div>
  );
}
