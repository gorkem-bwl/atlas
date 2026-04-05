import { useState, useRef, useEffect } from 'react';

// ─── Inline edit cell helper ──────────────────────────────────

export function InlineEditInput({
  value, type, onSave, onCancel,
}: {
  value: string;
  type: 'text' | 'number' | 'date';
  onSave: (val: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      type={type}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') onSave(val);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => onSave(val)}
      style={{
        width: '100%', padding: '4px 6px', border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)',
        background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  );
}

export function InlineSelectCell({
  value, options, onSave, onCancel,
}: {
  value: string;
  options: { value: string; label: string }[];
  onSave: (val: string) => void;
  onCancel: () => void;
}) {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  return (
    <select
      ref={selectRef}
      value={value}
      onChange={(e) => onSave(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => onCancel()}
      style={{
        width: '100%', padding: '4px 6px', border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)',
        background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
