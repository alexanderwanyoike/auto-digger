import { useCallback, useEffect, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import type { DiscoveryPage, DiscoveryShelf } from '../../shared/discovery';
import type { SearchPage } from '../../shared/search';
import { useScrollContinuation } from './use-scroll-continuation';
import { ReleaseMatchList } from '../discogs/ReleaseMatchList';
import { useDiscogsRetry } from './use-discogs-retry';

type Releases = SearchPage['releases'];

export function DiscoveryCollection({
  load,
  kind,
  seed,
  seen,
  playingReleaseId,
  disabled,
  onOpen,
  onPreview,
  previewBusy,
  onUnauthorized,
}: {
  load: NonNullable<DiscogsBridge['expandDiscovery']>;
  kind: DiscoveryShelf;
  seed: Releases;
  seen: ReadonlySet<number>;
  playingReleaseId: number | undefined;
  disabled: boolean;
  onOpen: (id: number) => void;
  onPreview: ((id: number) => void) | undefined;
  previewBusy: boolean;
  onUnauthorized: () => void;
}) {
  const [records, setRecords] = useState<Releases>([]);
  const [request, setRequest] = useState<{ cursor: DiscoveryPage['next'] } | null>({
    cursor: null,
  });
  const [next, setNext] = useState<DiscoveryPage['next']>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retryAt, setRetryAt] = useState<number>();
  const retry = useCallback(() => {
    setRetryAt(undefined);
    setError(null);
    setAttempt((previous) => previous + 1);
  }, []);
  useDiscogsRetry(retryAt, retry, !disabled);

  useEffect(() => {
    if (!request) return undefined;
    let active = true;
    load({ shelf: kind, cursor: request.cursor })
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          if (result.error.code === 'unauthorized') onUnauthorized();
          setRetryAt(result.error.retryAt);
          setError(result.error.message);
          return;
        }
        setRecords((previous) => {
          const unique = new Map(previous.map((record) => [record.id, record]));
          result.value.releases.forEach((record) => unique.set(record.id, record));
          return [...unique.values()];
        });
        setNext(result.value.next);
        setRequest(null);
      })
      .catch(() => {
        if (active) setError('Could not load more releases.');
      });
    return () => {
      active = false;
    };
  }, [attempt, kind, load, onUnauthorized, request]);

  const sentinel = useScrollContinuation(
    next && !request && !disabled
      ? () => {
          setRequest({ cursor: next });
        }
      : undefined,
  );

  const releases = [
    ...new Map([...seed, ...records].map((record) => [record.id, record])).values(),
  ].filter(({ id }) => id === playingReleaseId || !seen.has(id));
  return (
    <>
      <ReleaseMatchList
        releases={releases}
        disabled={disabled}
        onOpen={onOpen}
        onPreview={onPreview}
        previewBusy={previewBusy}
      />
      <div className="catalogue-continuation" ref={sentinel}>
        {request && !error && <p role="status">Loading releases…</p>}
        {!request && !next && !releases.length && <p>No unseen releases found.</p>}
        {error && (
          <>
            <p role={retryAt === undefined ? 'alert' : 'status'}>{error}</p>
            {retryAt === undefined && (
              <button
                className="secondary-button"
                type="button"
                disabled={disabled}
                onClick={retry}
              >
                Retry
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
