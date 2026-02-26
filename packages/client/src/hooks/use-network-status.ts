import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api-client';

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

const HEALTH_CHECK_INTERVAL = 30_000;
const RECONNECT_INTERVAL = 5_000;
const PING_TIMEOUT = 8_000;

/**
 * Tracks whether the app can reach the backend API.
 *
 * Combines browser online/offline events with a lightweight API ping
 * so it catches both network-level and server-level outages.
 *
 * Also listens for 'atlasmail:query-error' custom events — when React Query
 * encounters a failed request, it dispatches this event so we can immediately
 * check the connection instead of waiting for the next 30s interval.
 *
 * Uses chained setTimeout instead of setInterval so each tick picks the
 * correct delay without needing to clear/restart intervals.
 */
export function useNetworkStatus() {
  const [state, setState] = useState<ConnectionState>('connected');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      await api.get('/health', { timeout: PING_TIMEOUT });
      return true;
    } catch {
      return false;
    }
  }, []);

  // Schedule the next health-check tick. Each tick determines the next
  // delay based on the result, avoiding the recursive-setInterval bug.
  const scheduleTick = useCallback(
    (delay: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        const ok = await checkConnection();
        if (!mountedRef.current) return;
        setState((prev) => {
          // Fire restoration event when transitioning from disconnected to connected
          if (ok && prev !== 'connected') {
            document.dispatchEvent(new CustomEvent('atlasmail:connection-restored'));
          }
          return ok ? 'connected' : 'disconnected';
        });
        scheduleTick(ok ? HEALTH_CHECK_INTERVAL : RECONNECT_INTERVAL);
      }, delay);
    },
    [checkConnection],
  );

  useEffect(() => {
    mountedRef.current = true;

    const handleOnline = async () => {
      if (!mountedRef.current) return;
      setState('reconnecting');
      const ok = await checkConnection();
      if (!mountedRef.current) return;
      setState(ok ? 'connected' : 'disconnected');
      if (ok) {
        document.dispatchEvent(new CustomEvent('atlasmail:connection-restored'));
      }
      scheduleTick(ok ? HEALTH_CHECK_INTERVAL : RECONNECT_INTERVAL);
    };

    const handleOffline = () => {
      if (!mountedRef.current) return;
      setState('disconnected');
      scheduleTick(RECONNECT_INTERVAL);
    };

    const handleQueryError = async () => {
      if (!mountedRef.current) return;
      const ok = await checkConnection();
      if (!mountedRef.current) return;
      if (!ok) {
        setState('disconnected');
        scheduleTick(RECONNECT_INTERVAL);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('atlasmail:query-error', handleQueryError);

    if (navigator.onLine) {
      scheduleTick(HEALTH_CHECK_INTERVAL);
    } else {
      setState('disconnected');
      scheduleTick(RECONNECT_INTERVAL);
    }

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('atlasmail:query-error', handleQueryError);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [checkConnection, scheduleTick]);

  return state;
}
