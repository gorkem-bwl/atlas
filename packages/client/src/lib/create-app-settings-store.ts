import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api-client';
import { queryKeys } from '../config/query-keys';

// ─── Shared types ──────────────────────────────────────────────────

/** Generates `setFoo` setter names for each key in T */
type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface SettingsConfig<T> {
  defaults: T;
  /** Maps local field names to server column names: { defaultView: 'driveDefaultView' } */
  fieldMapping: Record<keyof T & string, string>;
}

// ─── Zustand-based settings store factory ──────────────────────────
// Used by: Drive, Docs, Draw, CRM, HR
//
// Creates a zustand store with auto-generated setters and server persistence.
// Each setter updates the store locally and persists to the server.
// A companion `useSync` hook hydrates the store from server settings on mount.

export function createAppSettingsStore<T extends AnyRecord>(
  config: SettingsConfig<T>,
) {
  const { defaults, fieldMapping } = config;

  // Reverse map: server key -> local key
  const fromServer: Record<string, string> = {};
  for (const [local, server] of Object.entries(fieldMapping)) {
    fromServer[server] = local;
  }

  function persistToServer(serverKey: string, value: unknown) {
    api.put('/settings', { [serverKey]: value }).catch(() => {});
  }

  type State = T & Setters<T> & {
    _hydrated: boolean;
    _hydrateFromServer: (data: AnyRecord) => void;
  };

  const useStore = create<State>()((set) => {
    const initial: AnyRecord = { ...defaults, _hydrated: false };

    // Generate setter functions: setDefaultView, setCompactMode, etc.
    for (const key of Object.keys(defaults)) {
      const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      initial[setterName] = (value: unknown) => {
        set({ [key]: value } as Partial<State>);
        persistToServer(fieldMapping[key as keyof T & string], value);
      };
    }

    // Hydration function
    initial._hydrateFromServer = (data: AnyRecord) => {
      const patch: AnyRecord = {};
      for (const [serverKey, localKey] of Object.entries(fromServer)) {
        if (serverKey in data && data[serverKey] !== undefined && data[serverKey] !== null) {
          patch[localKey] = data[serverKey];
        }
      }
      set({ ...patch, _hydrated: true } as Partial<State>);
    };

    return initial as State;
  });

  /** Call this hook once in the app's page component to hydrate settings from server */
  function useSync() {
    const hydrateFromServer = useStore((s) => s._hydrateFromServer);
    const hydrated = useStore((s) => s._hydrated);

    const { data: serverSettings } = useQuery({
      queryKey: queryKeys.settings.all,
      queryFn: async () => {
        const { data } = await api.get('/settings');
        return data.data as AnyRecord | null;
      },
      staleTime: 60_000,
    });

    useEffect(() => {
      if (serverSettings && !hydrated) {
        hydrateFromServer(serverSettings);
      }
    }, [serverSettings, hydrated, hydrateFromServer]);
  }

  return {
    useStore: useStore as UseBoundStore<StoreApi<T & Setters<T> & { _hydrated: boolean }>>,
    useSync,
  };
}

// ─── React Query-based settings hook factory ───────────────────────
// Used by: Tasks, Tables
//
// Returns a hook that derives settings from React Query cache.
// Updates use optimistic mutations. No zustand store involved.

export function createAppSettingsHook<T extends AnyRecord>(
  config: SettingsConfig<T>,
) {
  const { defaults, fieldMapping } = config;

  // Reverse map
  const fromServer: Record<string, string> = {};
  for (const [local, server] of Object.entries(fieldMapping)) {
    fromServer[server] = local;
  }

  function parseServerSettings(data: AnyRecord | null): T {
    if (!data) return { ...defaults };
    const result: AnyRecord = { ...defaults };
    for (const [serverKey, localKey] of Object.entries(fromServer)) {
      if (serverKey in data && data[serverKey] !== undefined && data[serverKey] !== null) {
        result[localKey] = data[serverKey];
      }
    }
    return result as T;
  }

  return function useAppSettings(): T & Setters<T> {
    const queryClient = useQueryClient();

    const { data: serverSettings } = useQuery({
      queryKey: queryKeys.settings.all,
      queryFn: async () => {
        const { data } = await api.get('/settings');
        return data.data as AnyRecord | null;
      },
      staleTime: 60_000,
    });

    const settings = useMemo(
      () => parseServerSettings(serverSettings ?? null),
      [serverSettings],
    );

    const mutation = useMutation({
      mutationFn: async (patch: AnyRecord) => {
        const { data } = await api.put('/settings', patch);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      },
    });

    const updateSetting = useCallback(
      <K extends keyof T & string>(key: K, value: T[K]) => {
        queryClient.setQueryData(
          queryKeys.settings.all,
          (old: AnyRecord | null | undefined) => ({
            ...(old ?? {}),
            [fieldMapping[key]]: value,
          }),
        );
        mutation.mutate({ [fieldMapping[key]]: value });
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [queryClient, mutation],
    );

    // Build setters object
    const setters = useMemo(() => {
      const s: Record<string, (v: unknown) => void> = {};
      for (const key of Object.keys(defaults)) {
        const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
        s[setterName] = (v: unknown) => updateSetting(key as keyof T & string, v as T[keyof T & string]);
      }
      return s;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateSetting]);

    return { ...settings, ...setters } as T & Setters<T>;
  };
}
