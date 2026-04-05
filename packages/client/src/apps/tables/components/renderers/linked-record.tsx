import { useState, useEffect, useRef } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import { Check } from 'lucide-react';

// ─── Linked record cell renderer ────────────────────────────────────

export function LinkedRecordRenderer(params: ICellRendererParams) {
  const linkedRows = params.colDef?.cellRendererParams?.linkedRows as Array<{ _id: string; [key: string]: unknown }> | undefined;
  const linkedColumns = params.colDef?.cellRendererParams?.linkedColumns as Array<{ id: string; name: string }> | undefined;
  const value = params.value;
  if (!value || !Array.isArray(value) || value.length === 0) return null;
  const firstCol = linkedColumns?.[0];
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', padding: '2px 0' }}>
      {value.map((rowId: string) => {
        const row = linkedRows?.find((r) => r._id === rowId);
        const label = row && firstCol ? String(row[firstCol.id] ?? '') : rowId.slice(0, 8);
        return (
          <span
            key={rowId}
            style={{
              display: 'inline-block',
              padding: '1px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-secondary)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-primary)',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label || rowId.slice(0, 8)}
          </span>
        );
      })}
    </div>
  );
}

// ─── Linked record cell editor ──────────────────────────────────────

export function LinkedRecordEditor(props: {
  value: string[];
  onValueChange: (val: string[]) => void;
  stopEditing: () => void;
  colDef: { cellRendererParams?: { linkedRows?: Array<{ _id: string; [key: string]: unknown }>; linkedColumns?: Array<{ id: string; name: string }> } };
}) {
  const { value: initialValue, onValueChange, stopEditing, colDef } = props;
  const linkedRows = colDef?.cellRendererParams?.linkedRows ?? [];
  const linkedColumns = colDef?.cellRendererParams?.linkedColumns ?? [];
  const firstCol = linkedColumns[0];
  const [selected, setSelected] = useState<string[]>(initialValue ?? []);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onValueChange(selected);
        stopEditing();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selected, onValueChange, stopEditing]);

  const filtered = linkedRows.filter((row) => {
    if (!search.trim()) return true;
    const label = firstCol ? String(row[firstCol.id] ?? '') : row._id;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const toggle = (rowId: string) => {
    const next = selected.includes(rowId)
      ? selected.filter((id) => id !== rowId)
      : [...selected, rowId];
    setSelected(next);
    onValueChange(next);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        zIndex: 100,
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        width: 240,
        maxHeight: 260,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
        style={{
          padding: '6px 8px',
          border: 'none',
          borderBottom: '1px solid var(--color-border-secondary)',
          outline: 'none',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          background: 'transparent',
          color: 'var(--color-text-primary)',
        }}
      />
      <div style={{ overflowY: 'auto', maxHeight: 220, padding: 4 }}>
        {filtered.map((row) => {
          const label = firstCol ? String(row[firstCol.id] ?? '') : row._id.slice(0, 8);
          const isSelected = selected.includes(row._id);
          return (
            <button
              key={row._id}
              onClick={() => toggle(row._id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '4px 8px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: isSelected ? 'var(--color-surface-selected)' : 'transparent',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                color: 'var(--color-text-primary)',
                textAlign: 'left',
              }}
            >
              <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isSelected ? <Check size={14} style={{ color: 'var(--color-accent-primary)' }} /> : null}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label || row._id.slice(0, 8)}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '8px', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
            No rows found
          </div>
        )}
      </div>
    </div>
  );
}
