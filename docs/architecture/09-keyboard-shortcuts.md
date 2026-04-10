# Part 9: Keyboard Shortcut System

AtlasMail implements Superhuman-style keyboard shortcuts: single-key actions,
vim-style navigation (j/k), and a command palette (Cmd+K). The system must be
customizable, context-aware, and never conflict with browser/OS shortcuts.

---

## 9.1 Default Shortcut Map

```typescript
// packages/shared/src/constants/shortcuts.ts

export interface ShortcutDefinition {
  id: string;
  keys: string;           // Key combo: "j", "shift+r", "mod+k"
  label: string;          // Human-readable label
  description: string;
  category: ShortcutCategory;
  when?: ShortcutContext;  // Context when this shortcut is active
}

export type ShortcutCategory =
  | 'navigation'
  | 'actions'
  | 'compose'
  | 'search'
  | 'ui';

export type ShortcutContext =
  | 'inbox'           // When viewing email list
  | 'thread'          // When viewing a thread
  | 'compose'         // When compose modal is open
  | 'search'          // When search is focused
  | 'global';         // Always active

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // ── NAVIGATION ────────────────────────────────────────
  {
    id: 'move_down',
    keys: 'j',
    label: 'Next conversation',
    description: 'Move cursor down in the email list',
    category: 'navigation',
    when: 'inbox',
  },
  {
    id: 'move_up',
    keys: 'k',
    label: 'Previous conversation',
    description: 'Move cursor up in the email list',
    category: 'navigation',
    when: 'inbox',
  },
  {
    id: 'open_thread',
    keys: 'Enter',
    label: 'Open conversation',
    description: 'Open the selected conversation',
    category: 'navigation',
    when: 'inbox',
  },
  {
    id: 'go_back',
    keys: 'Escape',
    label: 'Go back',
    description: 'Return to the email list',
    category: 'navigation',
    when: 'thread',
  },
  {
    id: 'go_important',
    keys: 'g i',
    label: 'Go to important',
    description: 'Navigate to the Important category',
    category: 'navigation',
    when: 'global',
  },
  {
    id: 'go_other',
    keys: 'g o',
    label: 'Go to other',
    description: 'Navigate to the Other category',
    category: 'navigation',
    when: 'global',
  },
  {
    id: 'go_newsletters',
    keys: 'g n',
    label: 'Go to newsletters',
    description: 'Navigate to the Newsletters category',
    category: 'navigation',
    when: 'global',
  },
  {
    id: 'go_notifications',
    keys: 'g t',
    label: 'Go to notifications',
    description: 'Navigate to the Notifications category',
    category: 'navigation',
    when: 'global',
  },

  // ── ACTIONS ───────────────────────────────────────────
  {
    id: 'archive',
    keys: 'e',
    label: 'Archive',
    description: 'Archive the selected conversation',
    category: 'actions',
    when: 'inbox',
  },
  {
    id: 'trash',
    keys: '#',
    label: 'Trash',
    description: 'Move to trash',
    category: 'actions',
    when: 'inbox',
  },
  {
    id: 'star',
    keys: 's',
    label: 'Star/Unstar',
    description: 'Toggle star on selected conversation',
    category: 'actions',
    when: 'inbox',
  },
  {
    id: 'mark_read',
    keys: 'shift+i',
    label: 'Mark as read',
    description: 'Mark the selected conversation as read',
    category: 'actions',
    when: 'inbox',
  },
  {
    id: 'mark_unread',
    keys: 'shift+u',
    label: 'Mark as unread',
    description: 'Mark the selected conversation as unread',
    category: 'actions',
    when: 'inbox',
  },
  {
    id: 'select_toggle',
    keys: 'x',
    label: 'Select/Deselect',
    description: 'Toggle selection on current conversation',
    category: 'actions',
    when: 'inbox',
  },
  {
    id: 'select_all',
    keys: 'mod+a',
    label: 'Select all',
    description: 'Select all visible conversations',
    category: 'actions',
    when: 'inbox',
  },
  {
    id: 'undo',
    keys: 'mod+z',
    label: 'Undo',
    description: 'Undo last action',
    category: 'actions',
    when: 'global',
  },

  // ── COMPOSE ───────────────────────────────────────────
  {
    id: 'compose_new',
    keys: 'c',
    label: 'Compose',
    description: 'Start a new email',
    category: 'compose',
    when: 'inbox',
  },
  {
    id: 'reply',
    keys: 'r',
    label: 'Reply',
    description: 'Reply to the current email',
    category: 'compose',
    when: 'thread',
  },
  {
    id: 'reply_all',
    keys: 'shift+r',
    label: 'Reply all',
    description: 'Reply to all recipients',
    category: 'compose',
    when: 'thread',
  },
  {
    id: 'forward',
    keys: 'f',
    label: 'Forward',
    description: 'Forward the current email',
    category: 'compose',
    when: 'thread',
  },
  {
    id: 'send',
    keys: 'mod+Enter',
    label: 'Send',
    description: 'Send the composed email',
    category: 'compose',
    when: 'compose',
  },
  {
    id: 'discard_draft',
    keys: 'mod+shift+Backspace',
    label: 'Discard draft',
    description: 'Discard the current draft',
    category: 'compose',
    when: 'compose',
  },

  // ── SEARCH & UI ───────────────────────────────────────
  {
    id: 'search',
    keys: '/',
    label: 'Search',
    description: 'Focus the search bar',
    category: 'search',
    when: 'global',
  },
  {
    id: 'command_palette',
    keys: 'mod+k',
    label: 'Command palette',
    description: 'Open the command palette',
    category: 'ui',
    when: 'global',
  },
  {
    id: 'toggle_sidebar',
    keys: 'mod+\\',
    label: 'Toggle sidebar',
    description: 'Show or hide the sidebar',
    category: 'ui',
    when: 'global',
  },
  {
    id: 'shortcut_help',
    keys: '?',
    label: 'Keyboard shortcuts',
    description: 'Show keyboard shortcut help',
    category: 'ui',
    when: 'global',
  },
];
```

---

## 9.2 Shortcut Engine

The engine listens for keyboard events at the document level, resolves key
sequences (like `g i`), respects context, and dispatches actions.

```typescript
// packages/client/src/lib/shortcut-engine.ts

type ShortcutHandler = () => void;

interface ShortcutBinding {
  keys: string;
  handler: ShortcutHandler;
  context: ShortcutContext;
}

export class ShortcutEngine {
  private bindings: Map<string, ShortcutBinding[]> = new Map();
  private currentContext: ShortcutContext = 'inbox';
  private sequenceBuffer: string[] = [];
  private sequenceTimeout: ReturnType<typeof setTimeout> | null = null;
  private enabled: boolean = true;

  constructor() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  setContext(context: ShortcutContext) {
    this.currentContext = context;
    this.resetSequence();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  register(id: string, keys: string, handler: ShortcutHandler, context: ShortcutContext = 'global') {
    const existing = this.bindings.get(id) || [];
    existing.push({ keys, handler, context });
    this.bindings.set(id, existing);
  }

  unregister(id: string) {
    this.bindings.delete(id);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.enabled) return;

    // Do not intercept when user is typing in an input field
    const target = event.target as HTMLElement;
    if (this.isEditableElement(target)) {
      // Only allow mod+key shortcuts in editable fields
      if (!event.metaKey && !event.ctrlKey) return;
    }

    const keyCombo = this.eventToKeyCombo(event);

    // Handle key sequences (e.g., "g" then "i")
    this.sequenceBuffer.push(keyCombo);
    const sequence = this.sequenceBuffer.join(' ');

    // Clear sequence after 1 second of inactivity
    if (this.sequenceTimeout) clearTimeout(this.sequenceTimeout);
    this.sequenceTimeout = setTimeout(() => this.resetSequence(), 1000);

    // Try to find a matching binding
    let matched = false;

    for (const [, bindings] of this.bindings) {
      for (const binding of bindings) {
        // Check if this binding matches the current sequence
        if (binding.keys !== sequence && binding.keys !== keyCombo) continue;

        // Check context: 'global' matches everything
        if (binding.context !== 'global' && binding.context !== this.currentContext) continue;

        // Check if this could be the start of a longer sequence
        const isPrefix = this.isPrefixOfAnyBinding(sequence);
        if (binding.keys === sequence || !isPrefix) {
          event.preventDefault();
          event.stopPropagation();
          binding.handler();
          this.resetSequence();
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    // If the current sequence doesn't match and isn't a prefix, reset
    if (!matched && !this.isPrefixOfAnyBinding(sequence)) {
      this.resetSequence();
    }
  };

  private eventToKeyCombo(event: KeyboardEvent): string {
    const parts: string[] = [];

    // Use 'mod' for Cmd on Mac, Ctrl on Windows/Linux
    if (event.metaKey || event.ctrlKey) parts.push('mod');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');

    // Normalize key name
    let key = event.key;
    if (key === ' ') key = 'Space';
    if (key.length === 1) key = key.toLowerCase();

    // Don't add modifier keys as the main key
    if (!['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) {
      parts.push(key);
    }

    return parts.join('+');
  }

  private isPrefixOfAnyBinding(sequence: string): boolean {
    for (const [, bindings] of this.bindings) {
      for (const binding of bindings) {
        if (binding.keys.startsWith(sequence + ' ') && binding.keys !== sequence) {
          return true;
        }
      }
    }
    return false;
  }

  private isEditableElement(element: HTMLElement): boolean {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') return true;
    if (element.tagName === 'SELECT') return true;
    if (element.isContentEditable) return true;
    if (element.closest('[contenteditable="true"]')) return true;
    return false;
  }

  private resetSequence() {
    this.sequenceBuffer = [];
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }
  }
}
```

---

## 9.3 React Integration

```typescript
// packages/client/src/providers/shortcut-provider.tsx

import { createContext, useContext, useEffect, useRef } from 'react';
import { ShortcutEngine } from '../lib/shortcut-engine';
import { DEFAULT_SHORTCUTS } from '@atlas-platform/shared';
import { useSettingsStore } from '../stores/settings-store';

const ShortcutContext = createContext<ShortcutEngine | null>(null);

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<ShortcutEngine>(new ShortcutEngine());
  return (
    <ShortcutContext.Provider value={engineRef.current}>
      {children}
    </ShortcutContext.Provider>
  );
}

export function useShortcutEngine() {
  const engine = useContext(ShortcutContext);
  if (!engine) throw new Error('useShortcutEngine must be used within ShortcutProvider');
  return engine;
}

// Hook to register a shortcut in a component
export function useShortcut(
  actionId: string,
  handler: () => void,
  context: ShortcutContext = 'global',
  enabled: boolean = true
) {
  const engine = useShortcutEngine();
  const customShortcuts = useSettingsStore(s => s.customShortcuts);

  useEffect(() => {
    if (!enabled) return;

    // Use custom key binding if user has overridden it
    const defaultDef = DEFAULT_SHORTCUTS.find(s => s.id === actionId);
    const keys = customShortcuts[actionId] || defaultDef?.keys;
    if (!keys) return;

    engine.register(actionId, keys, handler, context);
    return () => engine.unregister(actionId);
  }, [actionId, handler, context, enabled, customShortcuts, engine]);
}
```

### Usage in components:

```typescript
// packages/client/src/pages/inbox.tsx

export function InboxPage() {
  const {
    cursorIndex, moveCursor, activeThreadId, setActiveThread,
  } = useEmailStore();
  const { data: threads } = useThreads(activeCategory);
  const archiveMutation = useArchiveThread();
  const engine = useShortcutEngine();

  // Set the correct context
  useEffect(() => {
    engine.setContext(activeThreadId ? 'thread' : 'inbox');
  }, [activeThreadId, engine]);

  // Navigation
  useShortcut('move_down', () => {
    moveCursor(1, (threads?.length ?? 1) - 1);
  }, 'inbox');

  useShortcut('move_up', () => {
    moveCursor(-1, (threads?.length ?? 1) - 1);
  }, 'inbox');

  useShortcut('open_thread', () => {
    const thread = threads?.[cursorIndex];
    if (thread) setActiveThread(thread.id);
  }, 'inbox');

  useShortcut('go_back', () => {
    setActiveThread(null);
  }, 'thread');

  // Actions
  useShortcut('archive', () => {
    const thread = threads?.[cursorIndex];
    if (thread) archiveMutation.mutate(thread.id);
  }, 'inbox');

  // Compose
  useShortcut('compose_new', () => {
    useEmailStore.getState().openCompose('new');
  }, 'inbox');

  useShortcut('reply', () => {
    useEmailStore.getState().openCompose('reply', activeThreadId ?? undefined);
  }, 'thread');

  // ...
}
```

---

## 9.4 Shortcut Hint Display

Shortcuts are shown in tooltips, menus, and the command palette using a
`<Kbd>` component:

```typescript
// packages/client/src/components/ui/kbd.tsx

const KEY_SYMBOLS: Record<string, string> = {
  mod: navigator.platform.includes('Mac') ? '⌘' : 'Ctrl',
  shift: '⇧',
  alt: navigator.platform.includes('Mac') ? '⌥' : 'Alt',
  Enter: '↵',
  Backspace: '⌫',
  Escape: 'Esc',
  Space: '␣',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

export function Kbd({ shortcut }: { shortcut: string }) {
  const parts = shortcut.split('+').map(
    key => KEY_SYMBOLS[key] || key.toUpperCase()
  );

  return (
    <kbd className="shortcut-key">
      {parts.map((part, i) => (
        <span key={i} className="shortcut-key-part">{part}</span>
      ))}
    </kbd>
  );
}
```

---

## 9.5 Command Palette

The command palette (Cmd+K) uses Radix UI's `Dialog` with a `Combobox`-like
search inside it. It lists all available shortcuts plus additional commands
(switch account, go to settings, etc.).

```typescript
// packages/client/src/components/ui/command-palette.tsx

import * as Dialog from '@radix-ui/react-dialog';
import { DEFAULT_SHORTCUTS } from '@atlas-platform/shared';
import { useState, useMemo } from 'react';

export function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = useState('');

  const filteredCommands = useMemo(() => {
    if (!query) return DEFAULT_SHORTCUTS;
    const lower = query.toLowerCase();
    return DEFAULT_SHORTCUTS.filter(
      s => s.label.toLowerCase().includes(lower) ||
           s.description.toLowerCase().includes(lower)
    );
  }, [query]);

  return (
    <Dialog.Root open={commandPaletteOpen} onOpenChange={toggleCommandPalette}>
      <Dialog.Portal>
        <Dialog.Overlay className="command-palette-overlay" />
        <Dialog.Content className="command-palette-content">
          <input
            className="command-palette-input"
            placeholder="Type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <div className="command-palette-list">
            {filteredCommands.map(cmd => (
              <button
                key={cmd.id}
                className="command-palette-item"
                onClick={() => {
                  // Execute the command
                  toggleCommandPalette();
                }}
              >
                <span className="command-label">{cmd.label}</span>
                <Kbd shortcut={cmd.keys} />
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## 9.6 Disabling Shortcuts

Shortcuts are automatically disabled when:
1. The user is typing in a text input, textarea, or contenteditable element
   (except for `mod+` shortcuts like Cmd+Enter to send).
2. A modal dialog is open (compose, settings) that captures focus.
3. The user has explicitly disabled a shortcut in settings.

The `ShortcutEngine.isEditableElement()` check handles case 1. For case 2,
the compose modal calls `engine.setContext('compose')` which only activates
compose-specific shortcuts.
