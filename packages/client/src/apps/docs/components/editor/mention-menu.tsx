import { useRef, useEffect } from 'react';

// ─── @ Mention menu ──────────────────────────────────────────────────────

export function MentionMenu({
  items,
  selectedIndex,
  onSelect,
  position,
}: {
  items: Array<{ id: string; title: string; icon: string | null }>;
  selectedIndex: number;
  onSelect: (item: { id: string; title: string; icon: string | null }) => void;
  position: { top: number; left: number };
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const selected = menu.querySelector('.is-selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (items.length === 0) {
    return (
      <div
        className="mention-menu slash-command-menu"
        style={{ position: 'absolute', top: position.top, left: position.left }}
      >
        <div style={{ padding: '12px 16px', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
          No pages found
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="mention-menu slash-command-menu"
      style={{ position: 'absolute', top: position.top, left: position.left }}
    >
      <div style={{ padding: '4px 10px 2px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Link to page
      </div>
      {items.map((item, idx) => (
        <button
          key={item.id}
          className={`slash-command-item ${idx === selectedIndex ? 'is-selected' : ''}`}
          onClick={() => onSelect(item)}
        >
          <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>
            {item.icon || '\u{1F4C4}'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title || 'Untitled'}
          </span>
        </button>
      ))}
    </div>
  );
}
