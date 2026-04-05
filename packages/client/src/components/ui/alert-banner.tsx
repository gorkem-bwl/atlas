import type { ReactNode } from 'react';
import { AlertTriangle, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

type AlertVariant = 'warning' | 'info' | 'error' | 'success';

interface AlertBannerProps {
  variant?: AlertVariant;
  children: ReactNode;
  style?: React.CSSProperties;
}

const VARIANT_STYLES: Record<AlertVariant, { bg: string; border: string; icon: string }> = {
  warning: {
    bg: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-bg-primary))',
    border: 'color-mix(in srgb, var(--color-warning) 30%, var(--color-border-primary))',
    icon: 'var(--color-warning)',
  },
  info: {
    bg: 'color-mix(in srgb, var(--color-accent-primary) 8%, var(--color-bg-primary))',
    border: 'color-mix(in srgb, var(--color-accent-primary) 25%, var(--color-border-primary))',
    icon: 'var(--color-accent-primary)',
  },
  error: {
    bg: 'color-mix(in srgb, var(--color-error) 10%, var(--color-bg-primary))',
    border: 'color-mix(in srgb, var(--color-error) 30%, var(--color-border-primary))',
    icon: 'var(--color-error)',
  },
  success: {
    bg: 'color-mix(in srgb, var(--color-success) 10%, var(--color-bg-primary))',
    border: 'color-mix(in srgb, var(--color-success) 30%, var(--color-border-primary))',
    icon: 'var(--color-success)',
  },
};

const VARIANT_ICONS: Record<AlertVariant, typeof AlertTriangle> = {
  warning: AlertTriangle,
  info: Info,
  error: AlertCircle,
  success: CheckCircle2,
};

export function AlertBanner({ variant = 'info', children, style }: AlertBannerProps) {
  const v = VARIANT_STYLES[variant];
  const Icon = VARIANT_ICONS[variant];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-md) var(--spacing-lg)',
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-family)',
        color: 'var(--color-text-primary)',
        lineHeight: 'var(--line-height-normal)',
        ...style,
      }}
    >
      <Icon size={15} style={{ color: v.icon, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
