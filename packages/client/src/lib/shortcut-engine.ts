type ShortcutHandler = () => void;
type ShortcutContext = 'inbox' | 'thread' | 'compose' | 'search' | 'global';

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
    const target = event.target as HTMLElement;
    if (this.isEditableElement(target)) {
      if (!event.metaKey && !event.ctrlKey) return;
    }

    const keyCombo = this.eventToKeyCombo(event);
    this.sequenceBuffer.push(keyCombo);
    const sequence = this.sequenceBuffer.join(' ');

    if (this.sequenceTimeout) clearTimeout(this.sequenceTimeout);
    this.sequenceTimeout = setTimeout(() => this.resetSequence(), 1000);

    let matched = false;
    for (const [, bindings] of this.bindings) {
      for (const binding of bindings) {
        if (binding.keys !== sequence && binding.keys !== keyCombo) continue;
        if (binding.context !== 'global' && binding.context !== this.currentContext) continue;
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
    if (!matched && !this.isPrefixOfAnyBinding(sequence)) {
      this.resetSequence();
    }
  };

  private eventToKeyCombo(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.metaKey || event.ctrlKey) parts.push('mod');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    let key = event.key;
    if (key === ' ') key = 'Space';
    if (key.length === 1) key = key.toLowerCase();
    if (!['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) {
      parts.push(key);
    }
    return parts.join('+');
  }

  private isPrefixOfAnyBinding(sequence: string): boolean {
    for (const [, bindings] of this.bindings) {
      for (const binding of bindings) {
        if (binding.keys.startsWith(sequence + ' ') && binding.keys !== sequence) return true;
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
