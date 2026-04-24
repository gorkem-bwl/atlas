import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '../ui/button';

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
        width: 34,
        height: 20,
        borderRadius: 10,
        background: checked ? 'var(--color-accent-primary)' : 'var(--color-border-primary)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 0.2s ease',
        flexShrink: 0,
        outline: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 16 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'var(--color-bg-elevated)',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.06)',
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
  orientation = 'vertical',
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  style?: CSSProperties;
  /** `vertical` = icon-above-label cards (Theme, Font). `horizontal` = radio-row cards (Background type). */
  orientation?: 'vertical' | 'horizontal';
}) {
  const [hovered, setHovered] = useState(false);

  // Always a 1px border — selected state is conveyed by color + an inset
  // accent ring so the element doesn't jump 0.5px when selection changes.
  const border = selected
    ? '1px solid var(--color-accent-primary)'
    : `1px solid ${hovered ? 'var(--color-border-primary)' : 'var(--color-border-secondary)'}`;

  // Unified selected background: a faint gradient that mixes accent-primary
  // into the elevated surface. The same value is used everywhere (theme, font,
  // background-type) so cards look consistent across settings pages.
  const selectedBg =
    'linear-gradient(180deg, color-mix(in srgb, var(--color-accent-primary) 10%, var(--color-bg-elevated)) 0%, color-mix(in srgb, var(--color-accent-primary) 4%, var(--color-bg-elevated)) 100%)';
  const idleBg =
    'linear-gradient(180deg, var(--color-bg-elevated) 0%, var(--color-bg-tertiary) 100%)';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: orientation === 'vertical' ? 'center' : 'flex-start',
        gap: orientation === 'vertical' ? 'var(--spacing-sm)' : 'var(--spacing-md)',
        padding: 'var(--spacing-lg)',
        borderRadius: 'var(--radius-lg)',
        border,
        background: selected ? selectedBg : hovered ? 'var(--color-surface-hover)' : idleBg,
        boxShadow: selected
          ? 'inset 0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 40%, transparent)'
          : 'none',
        cursor: 'pointer',
        transition: 'border-color var(--transition-normal), background var(--transition-normal), box-shadow var(--transition-normal)',
        fontFamily: 'var(--font-family)',
        outline: 'none',
        textAlign: orientation === 'vertical' ? 'center' : 'left',
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
  searchable,
  searchPlaceholder,
  minWidth = 140,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  /** Show an inline filter input + scroll the option list. Turns on automatically for > 15 options. */
  searchable?: boolean;
  searchPlaceholder?: string;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const current = options.find((o) => o.value === value);
  const isSearchable = searchable ?? options.length > 15;
  const panelRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!isSearchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [isSearchable, options, query]);

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onBlur={(e) => {
        // Close when focus leaves the entire wrapper (button + popup).
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setTimeout(() => setOpen(false), 150);
        }
      }}
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(!open)}
        style={{
          minWidth,
          width: 'auto',
          justifyContent: 'space-between',
          padding: '0 var(--spacing-sm) 0 var(--spacing-md)',
          background: 'var(--color-bg-tertiary)',
        }}
      >
        {current?.label ?? ''}
        <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
      </Button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: '100%',
            width: isSearchable ? 320 : undefined,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
            padding: 'var(--spacing-xs)',
            maxHeight: isSearchable ? 360 : undefined,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {isSearchable && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                marginBottom: 4,
                borderBottom: '1px solid var(--color-border-secondary)',
              }}
            >
              <Search size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder ?? 'Search…'}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family)',
                }}
              />
            </div>
          )}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                No matches
              </div>
            )}
            {filteredOptions.map((opt) => (
              <Button
                key={String(opt.value)}
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  setQuery('');
                }}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderRadius: 'var(--radius-sm)',
                  background: opt.value === value ? 'var(--color-surface-selected)' : 'transparent',
                  color: opt.value === value ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                  fontWeight: opt.value === value
                    ? ('var(--font-weight-medium)' as CSSProperties['fontWeight'])
                    : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
