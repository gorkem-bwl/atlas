import { useEffect, useState } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../../hooks/use-network-status';

/**
 * Slim banner that appears at the top of the viewport when the API is
 * unreachable. Auto-hides when the connection is restored, briefly
 * showing a "reconnected" confirmation.
 */
export function ConnectionBanner() {
  const status = useNetworkStatus();
  const { t } = useTranslation();

  // Track whether we've *ever* been disconnected so we can show the
  // "reconnected" message briefly after recovery.
  const [wasDisconnected, setWasDisconnected] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (status === 'disconnected' || status === 'reconnecting') {
      setWasDisconnected(true);
      setShowReconnected(false);
    } else if (status === 'connected' && wasDisconnected) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasDisconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, wasDisconnected]);

  const isDisconnected = status === 'disconnected';
  const isReconnecting = status === 'reconnecting';
  const visible = isDisconnected || isReconnecting || showReconnected;

  if (!visible) return null;

  const bgColor = showReconnected
    ? 'var(--color-success, #16a34a)'
    : 'var(--color-error, #dc2626)';

  const message = showReconnected
    ? t('connection.restored')
    : isReconnecting
      ? t('connection.reconnecting')
      : t('connection.lost');

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-sm)',
        padding: '6px var(--spacing-md)',
        background: bgColor,
        color: '#ffffff',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-family)',
        fontWeight: 500,
        zIndex: 500,
        flexShrink: 0,
        animation: showReconnected
          ? 'connectionBannerFadeOut 3s ease forwards'
          : 'connectionBannerSlideIn 300ms ease forwards',
      }}
    >
      {isReconnecting ? (
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
      ) : !showReconnected ? (
        <WifiOff size={14} />
      ) : null}
      <span>{message}</span>
    </div>
  );
}
