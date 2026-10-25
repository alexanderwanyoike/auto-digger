import { useCallback, useEffect, useRef, useState } from 'react';
import type { DigFilters } from '../../shared/search';
import { emptyFilters } from '../../shared/defaultFilters';
import type {
  SavedFilters,
  SavedFiltersBridge,
  SavedFiltersResult,
} from '../../shared/savedFilters';
import { catalogueFailure } from '../../shared/catalogueFailure';

export function useSavedFilters(bridge: SavedFiltersBridge | undefined) {
  const [draft, setDraft] = useState(emptyFilters);
  const [presets, setPresets] = useState<SavedFilters['presets']>([]);
  const [ready, setReady] = useState(!bridge);
  const [busy, setBusy] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const edited = useRef(false);
  const pendingSave = useRef(Promise.resolve());
  const changeDraft = (value: DigFilters) => {
    edited.current = true;
    setDraft(value);
  };
  const perform = useCallback(
    async (
      operation: (api: SavedFiltersBridge) => Promise<SavedFiltersResult>,
    ): Promise<SavedFiltersResult> => {
      try {
        return bridge
          ? await operation(bridge)
          : catalogueFailure('unavailable', 'Use the desktop app to save filters.');
      } catch {
        return catalogueFailure(
          'unavailable',
          'Your saved filters could not be reached. Please retry.',
        );
      }
    },
    [bridge],
  );
  const reload = useCallback(async () => {
    const result = await perform((api) => api.read());
    if (result.ok) {
      setPresets(result.value.presets);
      if (!edited.current) {
        setDraft(result.value.draft);
      }
      setError(null);
      setReady(true);
      setReloadVersion((version) => version + 1);
    } else setError(result.error.message);
  }, [perform]);
  useEffect(() => {
    if (bridge) reload().catch(() => undefined);
  }, [bridge, reload]);
  useEffect(() => {
    if (!bridge || !ready || !edited.current) return undefined;
    let active = true;
    pendingSave.current = pendingSave.current.then(async () => {
      const result = await perform((api) => api.saveDraft(draft));
      if (!active) return;
      if (result.ok) setError(null);
      else if (result.error.code !== 'invalid-input') setError(result.error.message);
    });
    return () => {
      active = false;
    };
  }, [bridge, draft, ready, perform, reloadVersion]);
  async function mutate(operation: (api: SavedFiltersBridge) => Promise<SavedFiltersResult>) {
    setBusy(true);
    const result = await perform(operation);
    if (result.ok) {
      setPresets(result.value.presets);
      setError(null);
    } else setError(result.error.message);
    setBusy(false);
    return result;
  }
  return {
    draft,
    setDraft: changeDraft,
    presets,
    ready,
    busy,
    error,
    reload,
    available: Boolean(bridge) && ready,
    save: (name: string, id?: string) =>
      mutate((api) => api.savePreset({ name, filters: draft, ...(id ? { id } : {}) })),
    remove: (id: string) => mutate((api) => api.removePreset(id)),
  };
}
