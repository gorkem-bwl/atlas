import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { ShortcutEngine } from '../lib/shortcut-engine';
import { DEFAULT_SHORTCUTS } from '@atlas-platform/shared';
import { useSettingsStore } from '../stores/settings-store';

const ShortcutCtx = createContext<ShortcutEngine | null>(null);

export function ShortcutProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<ShortcutEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new ShortcutEngine();
  }

  useEffect(() => {
    const engine = engineRef.current!;
    engine.attach();
    return () => engine.detach();
  }, []);

  return <ShortcutCtx.Provider value={engineRef.current}>{children}</ShortcutCtx.Provider>;
}

export function useShortcutEngine() {
  const engine = useContext(ShortcutCtx);
  if (!engine) throw new Error('useShortcutEngine must be used within ShortcutProvider');
  return engine;
}

export function useShortcut(
  actionId: string,
  handler: () => void,
  context: 'inbox' | 'thread' | 'compose' | 'search' | 'global' = 'global',
  enabled = true,
) {
  const engine = useShortcutEngine();
  // Narrow selector: only re-render when this action's custom binding changes,
  // not when any unrelated setting changes.
  const customKeys = useSettingsStore((s) => s.customShortcuts[actionId]);
  // Stable ref for the handler so the effect doesn't re-run on every render
  // when the caller forgets to memoize the callback.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const defaultDef = DEFAULT_SHORTCUTS.find((s) => s.id === actionId);
    const keys = customKeys || defaultDef?.keys;
    if (!keys) return;
    engine.register(actionId, keys, () => handlerRef.current(), context);
    return () => engine.unregister(actionId);
  }, [actionId, context, enabled, customKeys, engine]);
}
