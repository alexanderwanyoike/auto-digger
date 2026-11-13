import { useCallback, useEffect, useRef, useState } from 'react';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsAccount, DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import type { SearchPage } from '../../shared/search';

type Releases = SearchPage['releases'];

export function useStarterShelf(
  load: DiscogsBridge['starterShelf'],
  account: DiscogsAccount | null,
  onUnauthorized: () => void,
  playingReleaseId: number | undefined,
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
    releases: Releases;
    error: string | null;
  } | null>(null);

  const playing = useRef(playingReleaseId);
  useEffect(() => {
    playing.current = playingReleaseId;
  }, [playingReleaseId]);

  useEffect(() => {
    if (!load || !account) return undefined;
    let active = true;
    const receive = (result: DiscogsResult<Releases>) => {
      if (!active) return;
      if (!result.ok && result.error.code === 'unauthorized') onUnauthorized();
      else {
        const playingId = playing.current;
        setResponse((previous) => {
          const previousReleases = previous?.account === account ? previous.releases : [];
          const activeRecord = previousReleases.find(({ id }) => id === playingId);
          const latest = result.ok ? result.value : previousReleases;
          const releases =
            activeRecord && !latest.some(({ id }) => id === activeRecord.id)
              ? [activeRecord, ...latest]
              : latest;
          return {
            account,
            load,
            revision,
            releases,
            error: result.ok ? null : result.error.message,
          };
        });
      }
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

  const latest =
    account && response?.account === account && response.load === load ? response : null;
  const busy = Boolean(account && load && latest?.revision !== revision);
  return {
    releases: (latest?.releases ?? []).filter(({ id }) => id === playingReleaseId || !seen.has(id)),
    busy,
    error: latest?.error ?? null,
    refresh: () => {
      setRevision((value) => value + 1);
    },
    markSeen,
    seen,
  };
}
