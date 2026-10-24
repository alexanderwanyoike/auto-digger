import { useEffect, useState } from 'react';
import type { DigFilters, SearchPage } from '../../shared/search';
import { discogsFailure } from '../../shared/discogsFailure';
import type {
  DiscogsAccount,
  DiscogsBridge,
  DiscogsError,
  DiscogsRelease,
  DiscogsResult,
} from '../../shared/discogs';

export function useDiscogs(bridge: DiscogsBridge | undefined) {
  const [account, setAccount] = useState<DiscogsAccount | null>(null);
  const [release, setRelease] = useState<DiscogsRelease | null>(null);
  const [matches, setMatches] = useState<SearchPage | null>(null);
  const [filters, setFilters] = useState<DigFilters | null>(null);
  const [busy, setBusy] = useState(Boolean(bridge));
  const [error, setError] = useState<DiscogsError | null>(null);

  useEffect(() => {
    if (!bridge) return undefined;
    let active = true;
    bridge
      .account()
      .then((result) => {
        if (!active) return;
        if (result.ok) setAccount(result.value);
        else setError(result.error);
        setBusy(false);
      })
      .catch(() => {
        if (active) {
          setBusy(false);
          setError({
            code: 'unavailable',
            message: 'Could not contact the desktop. Please restart Auto Digger.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [bridge]);

  async function perform<T>(
    operation: (api: DiscogsBridge) => Promise<DiscogsResult<T>>,
    apply?: (value: T) => void,
  ): Promise<DiscogsResult<T>> {
    setBusy(true);
    setError(null);
    let result: DiscogsResult<T>;
    try {
      result = bridge
        ? await operation(bridge)
        : discogsFailure('unavailable', 'Use the desktop app to connect to Discogs.');
    } catch {
      result = discogsFailure(
        'unavailable',
        'Could not contact the desktop. Please restart Auto Digger.',
      );
    }
    if (result.ok) apply?.(result.value);
    else {
      setError(result.error);
      if (result.error.code === 'unauthorized') {
        setMatches(null);
        setFilters(null);
        setAccount(null);
        setRelease(null);
      }
    }
    setBusy(false);
    return result;
  }

  return {
    account,
    matches,
    closeRelease: () => {
      setRelease(null);
    },
    filters,
    search: (criteria: DigFilters, page = 1) => {
      setMatches(null);
      setRelease(null);
      return perform(
        (api) => api.search({ filters: criteria, page }),
        (value) => {
          setMatches(value);
          setFilters(criteria);
        },
      );
    },
    release,
    busy,
    error,
    available: Boolean(bridge),
    clearError: () => {
      setError(null);
    },
    connect: (token: string) => perform((api) => api.connect(token), setAccount),
    loadRelease: (id: number) => {
      setRelease(null);
      return perform((api) => api.loadRelease(id), setRelease);
    },
    disconnect: () =>
      perform(
        (api) => api.disconnect(),
        () => {
          setMatches(null);
          setFilters(null);
          setAccount(null);
          setRelease(null);
        },
      ),
    openSettings: () => perform((api) => api.openSettings()),
  };
}
