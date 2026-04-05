import { Button } from '../../../../components/ui/button';

// ─── QuickLink ──────────────────────────────────────────────────────────

export function QuickLink({
  icon,
  label,
  onClick,
  active,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={icon}
      onClick={onClick}
      style={{
        width: '100%',
        justifyContent: 'flex-start',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        background: active ? 'var(--color-surface-selected)' : 'transparent',
        fontSize: 13,
      }}
    >
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {badge !== undefined && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            background: 'var(--color-surface-hover)',
            borderRadius: 8,
            padding: '1px 5px',
          }}
        >
          {badge}
        </span>
      )}
    </Button>
  );
}
