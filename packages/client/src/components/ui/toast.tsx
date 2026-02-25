/**
 * Toast notification system with undo support.
 *
 * Usage:
 *   // Mount once near the root:
 *   <ToastContainer />
 *
 *   // Show a plain info toast:
 *   const { addToast } = useToastStore();
 *   addToast({ type: 'info', message: 'Thread archived' });
 *
 *   // Show an undo toast (optimistic pattern):
 *   addToast({
 *     type: 'undo',
 *     message: 'Thread archived',
 *     undoAction: () => restoreThread(id),
 *     commitAction: () => archiveThread(id),
 *     duration: 5000,
 *   });
 */

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useToastStore } from '../../stores/toast-store';
import type { Toast } from '../../stores/toast-store';

// ─── Individual toast item ────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastItemProps) {
  const { commitToast, undoToast, dismissToast } = useToastStore();
  const duration = toast.duration ?? 5000;

  // Controls exit animation before actual removal
  const [exiting, setExiting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const exitingRef = useRef(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const triggerExit = (callback: () => void) => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    // Wait for the fadeOut animation to finish before removing from store
    setTimeout(callback, 280);
  };

  useEffect(() => {
    startTimeRef.current = Date.now();

    // Kick off the CSS transition: shrink from 100% to 0% over the full duration.
    // Use rAF to ensure the browser has painted the initial 100% width first.
    requestAnimationFrame(() => {
      if (progressBarRef.current) {
        progressBarRef.current.style.transition = `width ${duration}ms linear`;
        progressBarRef.current.style.width = '0%';
      }
    });

    // Auto-commit when the duration elapses
    timerRef.current = setTimeout(() => {
      triggerExit(() => commitToast(toast.id));
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Only run on mount — duration and id are stable for the lifetime of this item
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    triggerExit(() => undoToast(toast.id));
  };

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    triggerExit(() => dismissToast(toast.id));
  };

  const isUndoable = toast.type === 'undo' && typeof toast.undoAction === 'function';

  // Simple countdown for undo button label
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(duration / 1000));
  useEffect(() => {
    if (!isUndoable) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        padding: '10px var(--spacing-md)',
        background: 'var(--color-text-primary)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-elevated)',
        fontFamily: 'var(--font-family)',
        minWidth: 320,
        maxWidth: 400,
        overflow: 'hidden',
        animation: exiting
          ? 'toastFadeOut 280ms ease forwards'
          : 'toastSlideUp 220ms ease forwards',
        pointerEvents: 'all',
      }}
    >
      {/* Progress bar at the bottom edge */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'rgba(128, 128, 128, 0.3)',
        }}
      >
        <div
          ref={progressBarRef}
          style={{
            height: '100%',
            background: isUndoable ? 'var(--color-bg-primary)' : 'rgba(255, 255, 255, 0.4)',
            width: '100%',
            transformOrigin: 'left center',
          }}
        />
      </div>

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-bg-primary)',
          lineHeight: 'var(--line-height-normal)',
          fontWeight: 'var(--font-weight-normal)' as React.CSSProperties['fontWeight'],
        }}
      >
        {toast.message}
      </span>

      {/* Undo button + countdown */}
      {isUndoable && (
        <button
          onClick={handleUndo}
          aria-label="Undo action"
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px var(--spacing-sm)',
            border: '1px solid rgba(128, 128, 128, 0.4)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-bg-primary)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            transition: 'background var(--transition-normal), color var(--transition-normal)',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-primary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-bg-primary)';
          }}
        >
          Undo
          <span
            aria-hidden="true"
            style={{
              fontSize: 'var(--font-size-xs)',
              opacity: 0.7,
            }}
          >
            {secondsLeft}s
          </span>
        </button>
      )}

      {/* Close button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          background: 'transparent',
          color: 'rgba(128, 128, 128, 0.6)',
          cursor: 'pointer',
          transition: 'background var(--transition-normal), color var(--transition-normal)',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(128, 128, 128, 0.2)';
          e.currentTarget.style.color = 'var(--color-bg-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(128, 128, 128, 0.6)';
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Toast container ──────────────────────────────────────────────────

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 'var(--spacing-xl)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
