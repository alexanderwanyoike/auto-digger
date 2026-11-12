import { useEffect, useState } from 'react';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsAccount, DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import type { SearchPage } from '../../shared/search';

type Releases = SearchPage['releases'];

export function useStarterShelf(
  load: DiscogsBridge['starterShelf'],
  account: DiscogsAccount | null,
) {
  const [revision, setRevision] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(new Set());
  const [response, setResponse] = useState<{
    account: DiscogsAccount;
    revision: number;
    result: DiscogsResult<Releases>;
  } | null>(null);

  useEffect(() => {
    if (!load || !account) return undefined;
    let active = true;
    const receive = (result: DiscogsResult<Releases>) => {
      if (active) setResponse({ account, revision, result });
    };
    load()
      .then(receive)
      .catch(() => {
        receive(discogsFailure('unavailable', 'Could not refresh Explore. Please try again.'));
      });
    return () => {
      active = false;
    };
  }, [account, load, revision]);

  const result = account && response?.account === account ? response.result : null;
  const busy = Boolean(account && load && (!result || response?.revision !== revision));
  return {
    releases: result?.ok ? result.value.filter(({ id }) => !seen.has(id)) : [],
    busy,
    error: result && !result.ok ? result.error.message : null,
    refresh: () => {
      setRevision((value) => value + 1);
    },
    markSeen: (id: number) => {
      setSeen((current) => new Set([...current, id]));
    },
  };
}
