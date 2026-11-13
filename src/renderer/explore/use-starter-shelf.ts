import { useCallback, useEffect, useState } from 'react';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsAccount, DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import type { SearchPage } from '../../shared/search';

type Releases = SearchPage['releases'];

export function useStarterShelf(
  load: DiscogsBridge['starterShelf'],
  account: DiscogsAccount | null,
  onUnauthorized: () => void,
) {
  const [revision, setRevision] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(new Set());
  const markSeen = useCallback((id: number) => {
    setSeen((current) => (current.has(id) ? current : new Set([...current, id])));
  }, []);
  const [response, setResponse] = useState<{
    account: DiscogsAccount;
    load: NonNullable<DiscogsBridge['starterShelf']>;
    revision: number;
    result: DiscogsResult<Releases>;
  } | null>(null);

  useEffect(() => {
    if (!load || !account) return undefined;
    let active = true;
    const receive = (result: DiscogsResult<Releases>) => {
      if (!active) return;
      if (!result.ok && result.error.code === 'unauthorized') onUnauthorized();
      else setResponse({ account, load, revision, result });
    };
    load()
      .then(receive)
      .catch(() => {
        receive(discogsFailure('unavailable', 'Could not refresh Explore. Please try again.'));
      });
    return () => {
      active = false;
    };
  }, [account, load, onUnauthorized, revision]);

  const result =
    account && response?.account === account && response.load === load ? response.result : null;
  const busy = Boolean(account && load && (!result || response?.revision !== revision));
  return {
    releases: result?.ok ? result.value.filter(({ id }) => !seen.has(id)) : [],
    busy,
    error: result && !result.ok ? result.error.message : null,
    refresh: () => {
      setRevision((value) => value + 1);
    },
    markSeen,
  };
}
