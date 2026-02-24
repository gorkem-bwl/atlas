import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { ShortcutEngine } from '../lib/shortcut-engine';
import { DEFAULT_SHORTCUTS } from '@atlasmail/shared';
import { useSettingsStore } from '../stores/settings-store';

const ShortcutCtx = createContext<ShortcutEngine | null>(null);

export function ShortcutProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<ShortcutEngine>(new ShortcutEngine());

  useEffect(() => {
    return () => engineRef.current.destroy();
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
  const customShortcuts = useSettingsStore((s) => s.customShortcuts);

  useEffect(() => {
    if (!enabled) return;
    const defaultDef = DEFAULT_SHORTCUTS.find((s) => s.id === actionId);
    const keys = customShortcuts[actionId] || defaultDef?.keys;
    if (!keys) return;
    engine.register(actionId, keys, handler, context);
    return () => engine.unregister(actionId);
  }, [actionId, handler, context, enabled, customShortcuts, engine]);
}
