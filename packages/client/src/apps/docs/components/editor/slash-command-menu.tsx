import { useRef, useEffect } from 'react';
import type { SlashCommandItem } from './slash-commands';

// ─── Slash command menu ─────────────────────────────────────────────────

export function SlashCommandMenu({
  items,
  selectedIndex,
  onSelect,
  position,
}: {
  items: SlashCommandItem[];
  selectedIndex: number;
  onSelect: (item: SlashCommandItem) => void;
  position: { top: number; left: number };
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
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
        className="slash-command-menu"
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
        }}
      >
        <div style={{ padding: '12px 16px', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
          No results
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="slash-command-menu"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
      }}
    >
      {items.map((item, idx) => (
        <button
          key={item.title}
          className={`slash-command-item ${idx === selectedIndex ? 'is-selected' : ''}`}
          onClick={() => onSelect(item)}
          onMouseEnter={() => {}}
        >
          <div className="slash-command-item-icon">{item.icon}</div>
          <div className="slash-command-item-text">
            <div className="slash-command-item-title">{item.title}</div>
            <div className="slash-command-item-description">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
