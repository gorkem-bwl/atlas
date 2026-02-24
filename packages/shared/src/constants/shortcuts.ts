export interface ShortcutDefinition {
  id: string;
  keys: string;
  label: string;
  description: string;
  category: ShortcutCategory;
  when?: ShortcutContext;
}

export type ShortcutCategory = 'navigation' | 'actions' | 'compose' | 'search' | 'ui';
export type ShortcutContext = 'inbox' | 'thread' | 'compose' | 'search' | 'global';

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  { id: 'move_down', keys: 'j', label: 'Next conversation', description: 'Move cursor down in the email list', category: 'navigation', when: 'inbox' },
  { id: 'move_up', keys: 'k', label: 'Previous conversation', description: 'Move cursor up in the email list', category: 'navigation', when: 'inbox' },
  { id: 'open_thread', keys: 'Enter', label: 'Open conversation', description: 'Open the selected conversation', category: 'navigation', when: 'inbox' },
  { id: 'go_back', keys: 'Escape', label: 'Go back', description: 'Return to the email list', category: 'navigation', when: 'thread' },
  { id: 'go_important', keys: 'g i', label: 'Go to important', description: 'Navigate to Important', category: 'navigation', when: 'global' },
  { id: 'go_other', keys: 'g o', label: 'Go to other', description: 'Navigate to Other', category: 'navigation', when: 'global' },
  { id: 'go_newsletters', keys: 'g n', label: 'Go to newsletters', description: 'Navigate to Newsletters', category: 'navigation', when: 'global' },
  { id: 'go_notifications', keys: 'g t', label: 'Go to notifications', description: 'Navigate to Notifications', category: 'navigation', when: 'global' },
  { id: 'archive', keys: 'e', label: 'Archive', description: 'Archive the selected conversation', category: 'actions', when: 'inbox' },
  { id: 'trash', keys: '#', label: 'Trash', description: 'Move to trash', category: 'actions', when: 'inbox' },
  { id: 'star', keys: 's', label: 'Star/Unstar', description: 'Toggle star', category: 'actions', when: 'inbox' },
  { id: 'mark_read', keys: 'shift+i', label: 'Mark as read', description: 'Mark as read', category: 'actions', when: 'inbox' },
  { id: 'mark_unread', keys: 'shift+u', label: 'Mark as unread', description: 'Mark as unread', category: 'actions', when: 'inbox' },
  { id: 'select_toggle', keys: 'x', label: 'Select/Deselect', description: 'Toggle selection', category: 'actions', when: 'inbox' },
  { id: 'undo', keys: 'mod+z', label: 'Undo', description: 'Undo last action', category: 'actions', when: 'global' },
  { id: 'compose_new', keys: 'c', label: 'Compose', description: 'Start a new email', category: 'compose', when: 'inbox' },
  { id: 'reply', keys: 'r', label: 'Reply', description: 'Reply to current email', category: 'compose', when: 'thread' },
  { id: 'reply_all', keys: 'shift+r', label: 'Reply all', description: 'Reply to all', category: 'compose', when: 'thread' },
  { id: 'forward', keys: 'f', label: 'Forward', description: 'Forward current email', category: 'compose', when: 'thread' },
  { id: 'send', keys: 'mod+Enter', label: 'Send', description: 'Send the email', category: 'compose', when: 'compose' },
  { id: 'search', keys: '/', label: 'Search', description: 'Focus search bar', category: 'search', when: 'global' },
  { id: 'command_palette', keys: 'mod+k', label: 'Command palette', description: 'Open command palette', category: 'ui', when: 'global' },
  { id: 'toggle_sidebar', keys: 'mod+\\', label: 'Toggle sidebar', description: 'Show or hide sidebar', category: 'ui', when: 'global' },
  { id: 'shortcut_help', keys: '?', label: 'Keyboard shortcuts', description: 'Show shortcut help', category: 'ui', when: 'global' },
];
