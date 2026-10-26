import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultPreferences } from '../../shared/preferences';
import type { Preferences, PreferencesBridge, PreferencesResult } from '../../shared/preferences';
import { catalogueFailure } from '../../shared/catalogueFailure';

export function usePreferences(bridge: PreferencesBridge | undefined) {
  const [value, setValue] = useState(defaultPreferences);
  const [busy, setBusy] = useState(Boolean(bridge));
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  const perform = useCallback(
    async (operation: (api: PreferencesBridge) => Promise<PreferencesResult>) => {
      version.current += 1;
      const request = version.current;
      setBusy(true);
      setError(null);
      let result: PreferencesResult;
      try {
        result = bridge
          ? await operation(bridge)
          : catalogueFailure('unavailable', 'Use the desktop app to save settings.');
      } catch {
        result = catalogueFailure('unavailable', 'Your settings could not be saved. Please retry.');
      }
      if (request === version.current) {
        if (result.ok) setValue(result.value);
        else setError(result.error.message);
        setBusy(false);
      }
      return result;
    },
    [bridge],
  );
  useEffect(() => {
    if (bridge) perform((api) => api.read()).catch(() => undefined);
    return () => {
      version.current += 1;
    };
  }, [bridge, perform]);
  useEffect(() => {
    document.documentElement.dataset.material = value.material;
    document.documentElement.dataset.accent = value.accent;
  }, [value]);
  return {
    value,
    busy,
    error,
    available: Boolean(bridge),
    reload: () => perform((api) => api.read()),
    save: (patch: Partial<Omit<Preferences, 'directory'>>) =>
      perform((api) =>
        api.save({
          material: value.material,
          accent: value.accent,
          layout: value.layout,
          ...(value.folders ? { folders: value.folders } : {}),
          ...patch,
        }),
      ),
    chooseDirectory: () => perform((api) => api.chooseDirectory()),
  };
}
