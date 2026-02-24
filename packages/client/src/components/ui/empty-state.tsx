import type { CSSProperties } from 'react';

// ─── SVG Illustrations ────────────────────────────────────────────────

function InboxIllustration() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Envelope body */}
      <rect
        x="8"
        y="18"
        width="56"
        height="38"
        rx="4"
        fill="var(--color-bg-tertiary)"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
      />
      {/* Envelope flap (V shape) */}
      <polyline
        points="8,18 36,40 64,18"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      {/* Checkmark circle — bottom right badge */}
      <circle
        cx="52"
        cy="52"
        r="11"
        fill="var(--color-bg-primary)"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
      />
      <polyline
        points="46,52 50,56 58,47"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function SearchIllustration() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Magnifying glass circle */}
      <circle
        cx="30"
        cy="30"
        r="18"
        fill="var(--color-bg-tertiary)"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
      />
      {/* Handle */}
      <line
        x1="43"
        y1="43"
        x2="60"
        y2="60"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Question mark stem */}
      <path
        d="M26 34 C26 30 30 30 30 27 C30 24 34 24 34 27 C34 29.5 30 30 30 33"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Question mark dot */}
      <circle
        cx="30"
        cy="36.5"
        r="1.25"
        fill="var(--color-text-tertiary)"
      />
    </svg>
  );
}

function ArchiveIllustration() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Archive lid */}
      <rect
        x="8"
        y="16"
        width="56"
        height="12"
        rx="3"
        fill="var(--color-bg-tertiary)"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
      />
      {/* Archive box body */}
      <path
        d="M12 28 L12 54 C12 55.1 12.9 56 14 56 L58 56 C59.1 56 60 55.1 60 54 L60 28 Z"
        fill="var(--color-bg-tertiary)"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner flap line */}
      <path
        d="M26 38 L46 38"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Down arrow into box */}
      <path
        d="M36 30 L36 36 M33 33.5 L36 36 L39 33.5"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function TrashIllustration() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Lid handle */}
      <path
        d="M28 16 C28 14 30 12 36 12 C42 12 44 14 44 16"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lid bar */}
      <rect
        x="12"
        y="18"
        width="48"
        height="8"
        rx="3"
        fill="var(--color-bg-tertiary)"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
      />
      {/* Bin body */}
      <path
        d="M18 26 L20 57 C20 58.1 20.9 59 22 59 L50 59 C51.1 59 52 58.1 52 57 L54 26 Z"
        fill="var(--color-bg-tertiary)"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Vertical lines inside bin */}
      <line
        x1="30"
        y1="32"
        x2="30"
        y2="53"
        stroke="var(--color-text-tertiary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="36"
        y1="32"
        x2="36"
        y2="53"
        stroke="var(--color-text-tertiary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="42"
        y1="32"
        x2="42"
        y2="53"
        stroke="var(--color-text-tertiary)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Default content per type ─────────────────────────────────────────

const EMPTY_STATE_DEFAULTS = {
  inbox: {
    title: 'All caught up',
    description: 'No conversations in this category',
    illustration: InboxIllustration,
  },
  search: {
    title: 'No results found',
    description: 'Try different keywords',
    illustration: SearchIllustration,
  },
  archive: {
    title: 'No archived conversations',
    description: 'Archived threads will appear here',
    illustration: ArchiveIllustration,
  },
  trash: {
    title: 'Trash is empty',
    description: 'Deleted conversations will appear here',
    illustration: TrashIllustration,
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────

interface EmptyStateProps {
  type: 'inbox' | 'search' | 'archive' | 'trash';
  title?: string;
  description?: string;
}

const fadeInKeyframes = `
@keyframes atlasmail-empty-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

// Inject the keyframe once at module load time
if (typeof document !== 'undefined') {
  const styleId = 'atlasmail-empty-state-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = fadeInKeyframes;
    document.head.appendChild(style);
  }
}

export function EmptyState({ type, title, description }: EmptyStateProps) {
  const defaults = EMPTY_STATE_DEFAULTS[type];
  const Illustration = defaults.illustration;
  const resolvedTitle = title ?? defaults.title;
  const resolvedDescription = description ?? defaults.description;

  return (
    <div
      role="status"
      aria-label={resolvedTitle}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--spacing-md)',
        fontFamily: 'var(--font-family)',
        userSelect: 'none',
        animation: 'atlasmail-empty-fade-in 220ms ease both',
      }}
    >
      <div
        style={{
          color: 'var(--color-text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--spacing-xs)',
        }}
      >
        <Illustration />
      </div>

      <span
        style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
        }}
      >
        {resolvedTitle}
      </span>

      <span
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
          textAlign: 'center',
          maxWidth: 260,
          lineHeight: 'var(--line-height-normal)',
        }}
      >
        {resolvedDescription}
      </span>
    </div>
  );
}
