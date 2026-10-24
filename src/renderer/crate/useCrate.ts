import { useEffect, useState } from 'react';
import type { CrateBridge, CrateError, CrateResult } from '../../shared/crate';
import type { DiscogsRelease } from '../../shared/discogs';
import type { CatalogueBridge } from '../../shared/catalogue';
import { useCatalogue } from './useCatalogue';
import { crateFailure } from '../../shared/crateFailure';

export function useCrate(bridge: CrateBridge | undefined, catalogue?: CatalogueBridge) {
  const named = useCatalogue(catalogue);
  const [releases, setReleases] = useState<DiscogsRelease[]>([]);
  const [busy, setBusy] = useState(Boolean(bridge));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CrateError | null>(null);
  useEffect(() => {
    if (!bridge || catalogue) return undefined;
    let active = true;
    bridge
      .list()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setReleases(result.value);
          setReady(true);
        } else setError(result.error);
        setBusy(false);
      })
      .catch(() => {
        if (active) {
          setError({ code: 'unavailable', message: 'Could not load the crate. Please retry.' });
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [bridge, catalogue]);
  async function perform(
    operation: (api: CrateBridge) => Promise<CrateResult>,
  ): Promise<CrateResult> {
    setBusy(true);
    setError(null);
    let result: CrateResult;
    try {
      result = bridge
        ? await operation(bridge)
        : crateFailure('unavailable', 'Use the desktop app to save your crate.');
    } catch {
      result = crateFailure('unavailable', 'Could not contact crate storage. Please retry.');
    }
    if (result.ok) {
      setReleases(result.value);
      setReady(true);
    } else setError(result.error);
    setBusy(false);
    return result;
  }
  return {
    catalogue: named,
    releases: catalogue ? named.view.entries.map((entry) => entry.release) : releases,
    busy: catalogue ? named.busy : busy,
    ready: catalogue ? named.ready : ready,
    error: catalogue ? named.error : error,
    available: Boolean(catalogue ?? bridge),
    reload: () => (catalogue ? named.reload() : perform((api) => api.list())),
    save: (release: DiscogsRelease) =>
      catalogue
        ? named.perform((api) => api.add({ crateId: named.view.crateId ?? '', release }))
        : perform((api) => api.save(release)),
    remove: (id: number) =>
      catalogue
        ? named.perform((api) => api.remove({ crateId: named.view.crateId ?? '', releaseId: id }))
        : perform((api) => api.remove(id)),
  };
}
