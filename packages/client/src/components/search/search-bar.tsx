import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useUIStore } from '../../stores/ui-store';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { setSearchFocused } = useUIStore();

  function handleFocus() {
    setIsFocused(true);
    setSearchFocused(true);
  }

  function handleBlur() {
    setIsFocused(false);
    setSearchFocused(false);
  }

  function handleClear() {
    onChange('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      onSubmit?.(value);
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--spacing-lg)',
        height: '40px',
        background: isFocused ? 'var(--color-bg-elevated)' : 'var(--color-bg-tertiary)',
        border: `1px solid ${isFocused ? 'var(--color-border-focus)' : 'var(--color-border-primary)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'border-color var(--transition-fast), background var(--transition-fast)',
        gap: 'var(--spacing-sm)',
        boxSizing: 'border-box',
      }}
    >
      <Search
        size={15}
        style={{
          color: isFocused ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
          flexShrink: 0,
          transition: 'color var(--transition-fast)',
        }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Search emails"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-md)',
          fontFamily: 'var(--font-family)',
          minWidth: 0,
        }}
      />

      {/* Clear button or shortcut hint */}
      {value ? (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            padding: 0,
            color: 'var(--color-text-tertiary)',
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      ) : (
        !isFocused && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-tertiary)',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            /
          </span>
        )
      )}
    </div>
  );
}
