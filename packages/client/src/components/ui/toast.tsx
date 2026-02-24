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
  // Countdown value 0–100 (percentage remaining)
  const [progress, setProgress] = useState(100);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const exitingRef = useRef(false);

  const triggerExit = (callback: () => void) => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    // Wait for the fadeOut animation to finish before removing from store
    setTimeout(callback, 280);
  };

  useEffect(() => {
    startTimeRef.current = Date.now();

    // Animate the progress bar
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 1 - elapsed / duration) * 100;
      setProgress(remaining);
      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    // Auto-commit when the duration elapses
    timerRef.current = setTimeout(() => {
      triggerExit(() => commitToast(toast.id));
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // Only run on mount — duration and id are stable for the lifetime of this item
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    triggerExit(() => undoToast(toast.id));
  };

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    triggerExit(() => dismissToast(toast.id));
  };

  const isUndoable = toast.type === 'undo' && typeof toast.undoAction === 'function';

  const secondsLeft = Math.ceil((progress / 100) * (duration / 1000));

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
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        fontFamily: 'var(--font-family)',
        minWidth: 280,
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
          background: 'var(--color-border-secondary)',
        }}
      >
        <div
          style={{
            height: '100%',
            background: isUndoable ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
            width: `${progress}%`,
            transformOrigin: 'left center',
            transition: 'width 100ms linear',
          }}
        />
      </div>

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-text-primary)',
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
            border: '1px solid var(--color-accent-primary)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-accent-primary)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            transition: 'background var(--transition-fast), color var(--transition-fast)',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-accent-primary)';
            e.currentTarget.style.color = 'var(--color-text-inverse)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-accent-primary)';
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
          color: 'var(--color-text-tertiary)',
          cursor: 'pointer',
          transition: 'background var(--transition-fast), color var(--transition-fast)',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-surface-hover)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-tertiary)';
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
