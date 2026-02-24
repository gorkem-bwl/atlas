import * as Dialog from '@radix-ui/react-dialog';
import { useState, useMemo } from 'react';
import { DEFAULT_SHORTCUTS } from '@atlasmail/shared';
import { useUIStore } from '../../stores/ui-store';
import { useEmailStore } from '../../stores/email-store';
import { Kbd } from './kbd';
import { Search } from 'lucide-react';
import type { EmailCategory } from '@atlasmail/shared';

interface Command {
  id: string;
  label: string;
  description?: string;
  keys: string;
  action?: () => void;
}

export function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const { openCompose, setActiveCategory } = useEmailStore();
  const [query, setQuery] = useState('');

  // Build commands list — shortcuts + quick actions
  const allCommands: Command[] = useMemo(() => {
    const categoryActions: Command[] = [
      { id: 'go_important', label: 'Go to important', keys: 'g i', action: () => setActiveCategory('important' as EmailCategory) },
      { id: 'go_other', label: 'Go to other', keys: 'g o', action: () => setActiveCategory('other' as EmailCategory) },
      { id: 'go_newsletters', label: 'Go to newsletters', keys: 'g n', action: () => setActiveCategory('newsletters' as EmailCategory) },
      { id: 'go_notifications', label: 'Go to notifications', keys: 'g t', action: () => setActiveCategory('notifications' as EmailCategory) },
    ];
    const composeAction: Command = {
      id: 'compose_new',
      label: 'Compose new email',
      keys: 'c',
      action: () => openCompose('new'),
    };
    const shortcutCommands: Command[] = DEFAULT_SHORTCUTS
      .filter((s) => !categoryActions.some((a) => a.id === s.id) && s.id !== 'compose_new')
      .map((s) => ({ id: s.id, label: s.label, description: s.description, keys: s.keys }));

    return [composeAction, ...categoryActions, ...shortcutCommands];
  }, [openCompose, setActiveCategory]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const lower = query.toLowerCase();
    return allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(lower) ||
        (c.description && c.description.toLowerCase().includes(lower)),
    );
  }, [query, allCommands]);

  function handleSelect(cmd: Command) {
    cmd.action?.();
    toggleCommandPalette();
    setQuery('');
  }

  return (
    <Dialog.Root
      open={commandPaletteOpen}
      onOpenChange={(open) => {
        if (!open) {
          setQuery('');
          toggleCommandPalette();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="command-palette-overlay" />
        <Dialog.Content className="command-palette-content" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>

          {/* Search input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 var(--spacing-lg)',
              gap: 'var(--spacing-sm)',
              borderBottom: '1px solid var(--color-border-primary)',
            }}
          >
            <Search size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            <input
              className="command-palette-input"
              style={{ borderBottom: 'none', padding: 'var(--spacing-lg) 0' }}
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  toggleCommandPalette();
                  setQuery('');
                }
              }}
            />
          </div>

          {/* Command list */}
          <div className="command-palette-list" role="listbox" aria-label="Commands">
            {filteredCommands.length === 0 ? (
              <div
                style={{
                  padding: 'var(--spacing-2xl)',
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 'var(--font-size-md)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                No commands found for &quot;{query}&quot;
              </div>
            ) : (
              filteredCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  className="command-palette-item"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(cmd)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className="command-label">{cmd.label}</span>
                    {cmd.description && (
                      <span
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-tertiary)',
                          fontFamily: 'var(--font-family)',
                        }}
                      >
                        {cmd.description}
                      </span>
                    )}
                  </div>
                  <Kbd shortcut={cmd.keys} />
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
