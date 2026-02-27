import { useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// SettingsSection
// ---------------------------------------------------------------------------

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
      <div style={{ marginBottom: description ? 'var(--spacing-sm)' : 'var(--spacing-md)' }}>
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              lineHeight: 'var(--line-height-normal)',
            }}
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingsRow
// ---------------------------------------------------------------------------

export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--spacing-xl)',
        padding: 'var(--spacing-md) 0',
        borderBottom: '1px solid var(--color-border-secondary)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
            fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              marginTop: 3,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              lineHeight: 'var(--line-height-normal)',
            }}
          >
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingsToggle
// ---------------------------------------------------------------------------

export function SettingsToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 44,
        height: 24,
        borderRadius: 'var(--radius-full)',
        background: checked ? 'var(--color-accent-primary)' : 'var(--color-border-primary)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'background var(--transition-normal)',
        flexShrink: 0,
        outline: 'none',
      }}
      onFocus={() => {}}
      onBlur={() => {}}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#ffffff',
          transition: 'left var(--transition-normal)',
          boxShadow: 'var(--shadow-sm)',
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// SelectableCard
// ---------------------------------------------------------------------------

export function SelectableCard({
  selected,
  onClick,
  children,
  style,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--radius-lg)',
        border: selected
          ? '1.5px solid var(--color-accent-primary)'
          : `1px solid ${hovered ? 'var(--color-border-primary)' : 'var(--color-border-secondary)'}`,
        background: selected
          ? 'color-mix(in srgb, var(--color-accent-primary) 8%, transparent)'
          : hovered
            ? 'var(--color-surface-hover)'
            : 'var(--color-bg-tertiary)',
        cursor: 'pointer',
        transition: 'border-color var(--transition-normal), background var(--transition-normal)',
        fontFamily: 'var(--font-family)',
        outline: 'none',
        ...style,
      }}
      onFocus={() => {}}
      onBlur={() => {}}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// RadioOption
// ---------------------------------------------------------------------------

export function RadioOption({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--spacing-sm)',
        width: '100%',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: selected
          ? 'color-mix(in srgb, var(--color-accent-primary) 8%, transparent)'
          : hovered
            ? 'var(--color-surface-hover)'
            : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background var(--transition-normal)',
        fontFamily: 'var(--font-family)',
        outline: 'none',
      }}
      onFocus={() => {}}
      onBlur={() => {}}
    >
      <span
        style={{
          flexShrink: 0,
          marginTop: 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: selected
            ? '5px solid var(--color-accent-primary)'
            : '2px solid var(--color-text-tertiary)',
          background: 'transparent',
          transition: 'border var(--transition-normal)',
          boxSizing: 'border-box',
        }}
      />
      <div>
        <div
          style={{
            fontSize: 'var(--font-size-md)',
            color: selected ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
            fontWeight: selected
              ? ('var(--font-weight-medium)' as CSSProperties['fontWeight'])
              : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              marginTop: 2,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {description}
          </div>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// SettingsSelect
// ---------------------------------------------------------------------------

export function SettingsSelect<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          height: 34,
          padding: '0 var(--spacing-sm) 0 var(--spacing-md)',
          background: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border-primary)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-md)',
          fontFamily: 'var(--font-family)',
          cursor: 'pointer',
          minWidth: 140,
          justifyContent: 'space-between',
          transition: 'border-color var(--transition-normal)',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-focus)')}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-primary)';
          setTimeout(() => setOpen(false), 150);
        }}
      >
        {current?.label ?? ''}
        <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: '100%',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
            padding: 'var(--spacing-xs)',
            overflow: 'hidden',
          }}
        >
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                background: opt.value === value ? 'var(--color-surface-selected)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: opt.value === value ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                fontSize: 'var(--font-size-md)',
                fontFamily: 'var(--font-family)',
                fontWeight: opt.value === value
                  ? ('var(--font-weight-medium)' as CSSProperties['fontWeight'])
                  : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
                cursor: 'pointer',
                transition: 'background var(--transition-normal)',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) e.currentTarget.style.background = 'var(--color-surface-hover)';
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) e.currentTarget.style.background = 'transparent';
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
