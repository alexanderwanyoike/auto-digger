import { useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogueBridge, CatalogueView, CatalogueViewResult } from '../../shared/catalogue';
import type { CrateError } from '../../shared/crate';
import { catalogueFailure } from '../../shared/catalogueFailure';
import { readCrateSelection, saveCrateSelection } from './selection';

export function useCatalogue(bridge: CatalogueBridge | undefined) {
  const [remembered] = useState(readCrateSelection);
  const [view, setView] = useState<CatalogueView>({ crates: [], crateId: null, entries: [] });
  const [busy, setBusy] = useState(Boolean(bridge));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CrateError | null>(remembered.ok ? null : remembered.error);
  const selection = useRef<string | undefined>(remembered.ok ? remembered.value : undefined);
  const version = useRef(0);
  const perform = useCallback(
    async (operation: (api: CatalogueBridge) => Promise<CatalogueViewResult>) => {
      version.current += 1;
      const request = version.current;
      setBusy(true);
      setError(null);
      let result: CatalogueViewResult;
      try {
        result = bridge
          ? await operation(bridge)
          : catalogueFailure('unavailable', 'Use the desktop app to manage crates.');
      } catch {
        result = catalogueFailure('unavailable', 'Your crates could not be reached. Please retry.');
      }
      if (request === version.current) {
        if (result.ok) {
          selection.current = result.value.crateId ?? undefined;
          setView(result.value);
          setReady(true);
          const saved = saveCrateSelection(result.value.crateId);
          if (!saved.ok) setError(saved.error);
        } else setError(result.error);
        setBusy(false);
      }
      return result;
    },
    [bridge],
  );
  const reload = useCallback(
    () =>
      perform(async (api) => {
        const requested = selection.current;
        let fallback = requested === undefined;
        let result = await api.view(requested);
        if (!result.ok && result.error.code === 'invalid-input' && requested !== undefined) {
          result = await api.view();
          fallback = true;
        }
        if (result.ok && fallback && !result.value.entries.length) {
          const populated = result.value.crates.find((crate) => crate.releaseCount > 0);
          if (populated) return api.view(populated.id);
        }
        return result;
      }),
    [perform],
  );
  useEffect(() => {
    if (bridge) reload().catch(() => undefined);
    return () => {
      version.current += 1;
    };
  }, [bridge, reload]);
  useEffect(
    () =>
      bridge?.onChanged?.(() => {
        reload().catch(() => undefined);
      }),
    [bridge, reload],
  );
  return { view, busy, ready, error, perform, reload, available: Boolean(bridge) };
}
