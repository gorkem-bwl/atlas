import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Play,
  Square,
  RefreshCw,
  Trash2,
  FileText,
  MoreHorizontal,
  Loader2,
  Download,
  MemoryStick,
  HardDrive,
} from 'lucide-react';
import type { MarketplaceCatalogItem } from '@atlas-platform/shared';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';
import { Tooltip } from '../../../components/ui/tooltip';
import {
  useDeployApp,
  useStartApp,
  useStopApp,
  useUpdateApp,
  useRemoveApp,
} from '../hooks';
import { getAppIcon, StatusBadge, MenuItemButton } from './marketplace-helpers';
import { DeployConfirmModal, RemoveConfirmModal, LogsModal } from './marketplace-modals';

export function AppCard({
  app,
  isAdmin,
  t,
}: {
  app: MarketplaceCatalogItem;
  isAdmin: boolean;
  t: (key: string, opts?: Record<string, string>) => string;
}) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const deployMutation = useDeployApp();
  const startMutation = useStartApp();
  const stopMutation = useStopApp();
  const updateMutation = useUpdateApp();
  const removeMutation = useRemoveApp();

  const status = app.status;
  const isInstalled = app.installed;
  const isRunning = status === 'running';
  const isStopped = status === 'stopped';
  const isFailed = status === 'failed';
  const isInstalling = status === 'installing' || deployMutation.isPending;
  const isCompatible = app.platformCompatible !== false;

  const handleDeploy = () => {
    deployMutation.mutate({ appId: app.id });
    setDeployModalOpen(false);
  };

  const handleStart = () => {
    startMutation.mutate(app.id, {
      onSuccess: () => navigate(`/marketplace/startup/${app.id}`),
    });
  };
  const handleStop = () => stopMutation.mutate(app.id);
  const handleUpdate = () => updateMutation.mutate(app.id);
  const handleRemove = () => {
    removeMutation.mutate(app.id);
    setRemoveModalOpen(false);
  };

  const AppIcon = getAppIcon(app.icon);

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          background: 'var(--gradient-card-subtle)',
          border: '1px solid',
          borderColor: hovered ? app.color + '44' : 'var(--color-border-primary)',
          boxShadow: hovered ? `0 0 0 1px ${app.color}22` : 'none',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        {/* Background icon */}
        <AppIcon
          size={100}
          strokeWidth={0.5}
          style={{
            position: 'absolute',
            right: -12,
            bottom: -12,
            color: app.color,
            opacity: 0.07,
            pointerEvents: 'none',
            transform: 'rotate(-12deg)',
          }}
        />

        {/* Header row: icon + name + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: app.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AppIcon size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              {app.name}
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
                textTransform: 'capitalize',
              }}
            >
              {app.category}
            </div>
          </div>
          <StatusBadge status={status} t={t} />
        </div>

        {/* Description */}
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-family)',
            lineHeight: 'var(--line-height-normal)',
            flex: 1,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {app.description}
        </p>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', position: 'relative', zIndex: 1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <MemoryStick size={12} /> {app.resources.minRam}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <HardDrive size={12} /> {app.resources.estimatedDisk}
          </span>
          <Badge>{app.license}</Badge>
          {app.updateAvailable && (
            <Badge variant="warning">{t('marketplace.updateAvailable')}</Badge>
          )}
          {isInstalled && app.assignedPort && (
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family-mono, monospace)',
              }}
            >
              :{app.assignedPort}
            </span>
          )}
        </div>

        {/* Action buttons row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}
        >
          {/* Not installed: Deploy button */}
          {!isInstalled && !isInstalling && isAdmin && isCompatible && (
            <Button
              variant="primary"
              size="sm"
              icon={<Download size={14} />}
              onClick={() => setDeployModalOpen(true)}
            >
              {t('marketplace.deploy')}
            </Button>
          )}

          {/* Not compatible with this platform */}
          {!isInstalled && !isInstalling && !isCompatible && (
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              {t('marketplace.platformIncompatible')}
            </span>
          )}

          {/* Not installed, not admin */}
          {!isInstalled && !isInstalling && !isAdmin && isCompatible && (
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              {t('marketplace.adminRequired')}
            </span>
          )}

          {/* Installing */}
          {isInstalling && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
              }}
            >
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              {t('marketplace.statusInstalling')}
            </div>
          )}

          {/* Running: Open + Stop + overflow */}
          {isRunning && (
            <>
              <a
                href={`http://${window.location.hostname}:${app.assignedPort}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Button variant="primary" size="sm" icon={<ExternalLink size={14} />}>
                  {t('marketplace.open')}
                </Button>
              </a>
              {isAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={stopMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Square size={12} />}
                  onClick={handleStop}
                  disabled={stopMutation.isPending}
                >
                  {stopMutation.isPending ? t('marketplace.stopping') : t('marketplace.stop')}
                </Button>
              )}
            </>
          )}

          {/* Stopped: Start + overflow */}
          {isStopped && isAdmin && (
            <Button
              variant="primary"
              size="sm"
              icon={startMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
              onClick={handleStart}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? t('marketplace.starting') : t('marketplace.start')}
            </Button>
          )}

          {/* Failed: retry */}
          {isFailed && isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              icon={startMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
              onClick={handleStart}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? t('marketplace.starting') : t('common.retry')}
            </Button>
          )}

          {/* Spacer to push overflow right */}
          <div style={{ flex: 1 }} />

          {/* Website link */}
          <Tooltip content={app.website}>
            <a href={app.website} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="ghost" size="sm" icon={<ExternalLink size={14} />} />
            </a>
          </Tooltip>

          {/* Overflow menu for installed apps */}
          {isInstalled && isAdmin && (
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" icon={<MoreHorizontal size={14} />} />
              </PopoverTrigger>
              <PopoverContent width={180} style={{ padding: 'var(--spacing-xs)' }}>
                {app.updateAvailable && (
                  <MenuItemButton
                    icon={<RefreshCw size={14} />}
                    label={t('marketplace.update')}
                    onClick={() => { handleUpdate(); setMenuOpen(false); }}
                    disabled={updateMutation.isPending}
                  />
                )}
                <MenuItemButton
                  icon={<FileText size={14} />}
                  label={t('marketplace.logs')}
                  onClick={() => { setLogsModalOpen(true); setMenuOpen(false); }}
                />
                <MenuItemButton
                  icon={<Trash2 size={14} />}
                  label={t('marketplace.remove')}
                  onClick={() => { setRemoveModalOpen(true); setMenuOpen(false); }}
                  destructive
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Modals */}
      <DeployConfirmModal
        app={app}
        open={deployModalOpen}
        onOpenChange={setDeployModalOpen}
        onConfirm={handleDeploy}
        isDeploying={deployMutation.isPending}
        t={t}
      />
      <RemoveConfirmModal
        app={app}
        open={removeModalOpen}
        onOpenChange={setRemoveModalOpen}
        onConfirm={handleRemove}
        isRemoving={removeMutation.isPending}
        t={t}
      />
      <LogsModal
        appId={app.id}
        appName={app.name}
        open={logsModalOpen}
        onOpenChange={setLogsModalOpen}
        t={t}
      />
    </>
  );
}
