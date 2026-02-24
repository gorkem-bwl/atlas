/**
 * Skeleton shimmer loading placeholders.
 *
 * Usage:
 *   // Generic block
 *   <Skeleton width="100%" height={16} borderRadius={4} />
 *
 *   // Email list placeholder
 *   <EmailListSkeleton />
 *
 *   // Reading pane placeholder
 *   <ReadingPaneSkeleton />
 */

import type { CSSProperties } from 'react';

// ─── Base Skeleton ────────────────────────────────────────────────────

interface SkeletonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  borderRadius?: CSSProperties['borderRadius'];
  style?: CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 4, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        background:
          'linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-bg-elevated) 50%, var(--color-bg-tertiary) 75%)',
        backgroundSize: '400px 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

// ─── Email list skeleton ──────────────────────────────────────────────
//
// Mirrors the EmailListItem layout:
//   [dot] [avatar] [sender + time]
//                  [subject]
//                  [snippet]

function EmailListItemSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-md) var(--spacing-md)',
        borderBottom: '1px solid var(--color-border-primary)',
      }}
    >
      {/* Unread indicator dot */}
      <div style={{ display: 'flex', alignItems: 'center', paddingTop: 6, flexShrink: 0 }}>
        <Skeleton width={6} height={6} borderRadius="50%" />
      </div>

      {/* Avatar circle */}
      <Skeleton width={32} height={32} borderRadius="50%" style={{ flexShrink: 0, marginTop: 2 }} />

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Sender name + timestamp row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-sm)' }}>
          <Skeleton width="40%" height={13} borderRadius={3} />
          <Skeleton width={48} height={11} borderRadius={3} style={{ flexShrink: 0 }} />
        </div>

        {/* Subject line */}
        <Skeleton width="75%" height={13} borderRadius={3} />

        {/* Snippet */}
        <Skeleton width="90%" height={11} borderRadius={3} />
      </div>
    </div>
  );
}

export function EmailListSkeleton() {
  return (
    <div aria-label="Loading conversations" aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <EmailListItemSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Reading pane skeleton ────────────────────────────────────────────
//
// Mirrors the ReadingPane layout:
//   [subject header]
//   [action toolbar]
//   [sender info block]
//   [body lines]

export function ReadingPaneSkeleton() {
  return (
    <div
      aria-label="Loading conversation"
      aria-busy="true"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      {/* Subject header area */}
      <div
        style={{
          padding: 'var(--spacing-lg) var(--spacing-xl)',
          borderBottom: '1px solid var(--color-border-primary)',
          background: 'var(--color-bg-secondary)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
        }}
      >
        <Skeleton width="65%" height={20} borderRadius={4} />
        <Skeleton width={80} height={12} borderRadius={3} />
      </div>

      {/* Action toolbar row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          borderBottom: '1px solid var(--color-border-primary)',
          flexShrink: 0,
        }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} width={28} height={28} borderRadius={6} />
        ))}
        <div style={{ flex: 1 }} />
        <Skeleton width={28} height={28} borderRadius={6} />
        <Skeleton width={28} height={28} borderRadius={6} />
      </div>

      {/* Email message block */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--spacing-lg) var(--spacing-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-xl)',
        }}
      >
        {/* Sender info row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
          <Skeleton width={40} height={40} borderRadius="50%" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="30%" height={14} borderRadius={3} />
            <Skeleton width="45%" height={12} borderRadius={3} />
          </div>
          <Skeleton width={72} height={12} borderRadius={3} style={{ flexShrink: 0 }} />
        </div>

        {/* Body paragraph lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton width="95%" height={14} borderRadius={3} />
          <Skeleton width="88%" height={14} borderRadius={3} />
          <Skeleton width="92%" height={14} borderRadius={3} />
          <Skeleton width="70%" height={14} borderRadius={3} />
        </div>

        {/* Second paragraph */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton width="90%" height={14} borderRadius={3} />
          <Skeleton width="85%" height={14} borderRadius={3} />
          <Skeleton width="50%" height={14} borderRadius={3} />
        </div>

        {/* Closing line */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton width="30%" height={14} borderRadius={3} />
          <Skeleton width="20%" height={14} borderRadius={3} />
        </div>
      </div>
    </div>
  );
}
