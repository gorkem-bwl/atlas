import { type CSSProperties, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// StatCard — KPI / metric card with optional background icon
// ---------------------------------------------------------------------------

export interface StatCardProps {
  label: string;
  value: string | ReactNode;
  subtitle?: string;
  color?: string;
  icon?: LucideIcon;
}

export function StatCard({ label, value, color, icon: Icon, subtitle }: StatCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '18px 20px',
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-lg)',
        flex: 1,
        minWidth: 180,
        overflow: 'hidden',
      }}
    >
      {Icon && (
        <Icon
          size={72}
          strokeWidth={0.8}
          style={{
            position: 'absolute',
            right: -8,
            bottom: -8,
            color: color ?? 'var(--color-text-tertiary)',
            opacity: 0.06,
            pointerEvents: 'none',
            transform: 'rotate(-12deg)',
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-bold)' as CSSProperties['fontWeight'],
          color: color ?? 'var(--color-text-primary)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.5px',
        }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 3 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoCard — key-value rows with optional background icon
// ---------------------------------------------------------------------------

export interface InfoCardProps {
  title: string;
  rows: { label: string; value: string }[];
  icon?: LucideIcon;
}

export function InfoCard({ title, rows, icon: Icon }: InfoCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '18px 20px',
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {Icon && (
        <Icon
          size={80}
          strokeWidth={0.6}
          style={{
            position: 'absolute',
            right: -12,
            top: -12,
            color: 'var(--color-text-tertiary)',
            opacity: 0.04,
            pointerEvents: 'none',
            transform: 'rotate(10deg)',
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
          color: 'var(--color-text-primary)',
          marginBottom: 12,
        }}>
          {title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{row.label}</span>
              <span style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
              }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
