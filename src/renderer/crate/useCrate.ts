import { useEffect, useState } from 'react';
import type { CrateBridge, CrateError, CrateResult } from '../../shared/crate';
import type { DiscogsRelease } from '../../shared/discogs';
import { crateFailure } from '../../shared/crateFailure';

export function useCrate(bridge: CrateBridge | undefined) {
  const [releases, setReleases] = useState<DiscogsRelease[]>([]);
  const [busy, setBusy] = useState(Boolean(bridge));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CrateError | null>(null);
  useEffect(() => {
    if (!bridge) return undefined;
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
  }, [bridge]);
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
    releases,
    busy,
    ready,
    error,
    available: Boolean(bridge),
    reload: () => perform((api) => api.list()),
    save: (release: DiscogsRelease) => perform((api) => api.save(release)),
    remove: (id: number) => perform((api) => api.remove(id)),
  };
}
