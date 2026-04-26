import type { ListData, BadgeTone } from '../tour-types';

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: '#dcfce7', fg: '#15803d' },
  info: { bg: '#dbeafe', fg: '#1d4ed8' },
  warning: { bg: '#fef3c7', fg: '#a16207' },
  danger: { bg: '#fee2e2', fg: '#b91c1c' },
  neutral: { bg: '#f1f5f9', fg: '#475569' },
};

export function ListIllustration({ data }: { data: ListData }) {
  const visibleRows = data.rows.slice(0, 5);

  return (
    <div className="tour-illust tour-illust--list">
      {visibleRows.map((row, index) => {
        const fadeAmount =
          index < data.fadeFrom ? 1 : Math.max(0.2, 1 - (index - data.fadeFrom + 1) * 0.32);

        const isCollabRow =
          data.collaborator !== undefined && data.collaborator.targetRowIndex === index;

        return (
          <div
            key={index}
            className={`tour-illust-row${isCollabRow ? ' tour-illust-row--collab' : ''}`}
            style={{
              opacity: fadeAmount,
              borderColor: isCollabRow && data.collaborator ? data.collaborator.color : undefined,
              boxShadow:
                isCollabRow && data.collaborator
                  ? `0 0 0 2px ${hexToRgba(data.collaborator.color, 0.18)}`
                  : undefined,
            }}
          >
            <div
              className="tour-illust-avatar"
              style={{ background: row.avatarColor }}
            >
              {row.initials}
            </div>
            <div className="tour-illust-row-text">
              <div className="tour-illust-row-primary">{row.primary}</div>
              <div className="tour-illust-row-secondary">{row.secondary}</div>
            </div>
            {row.badge && (
              <span
                className="tour-illust-badge"
                style={{
                  background: BADGE_TONES[row.badge.tone].bg,
                  color: BADGE_TONES[row.badge.tone].fg,
                }}
              >
                {row.badge.label}
              </span>
            )}

            {isCollabRow && data.collaborator && (
              <>
                <svg
                  className="tour-illust-cursor"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  aria-hidden="true"
                >
                  <path
                    d="M2 1 L2 11 L5 8 L7 12 L9 11 L7 7 L11 7 Z"
                    fill={data.collaborator.color}
                    stroke="white"
                    strokeWidth="0.8"
                  />
                </svg>
                <span
                  className="tour-illust-cursor-flag"
                  style={{ background: data.collaborator.color }}
                >
                  {data.collaborator.name}
                </span>
              </>
            )}
          </div>
        );
      })}
      <div className="tour-illust-fade" />
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
