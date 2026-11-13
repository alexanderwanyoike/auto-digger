import { useEffect, useRef, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import type { DiscoveryPage, DiscoveryShelf } from '../../shared/discovery';
import type { SearchPage } from '../../shared/search';
import { ReleaseMatchList } from '../discogs/ReleaseMatchList';

type Releases = SearchPage['releases'];

export function DiscoveryCollection({
  load,
  kind,
  seed,
  seen,
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
  const [retry, setRetry] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!request) return undefined;
    let active = true;
    load({ shelf: kind, cursor: request.cursor })
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          if (result.error.code === 'unauthorized') onUnauthorized();
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
  }, [kind, load, onUnauthorized, request, retry]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !next || request || disabled) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setRequest({ cursor: next });
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [disabled, next, request]);

  const releases = [
    ...new Map([...seed, ...records].map((record) => [record.id, record])).values(),
  ].filter(({ id }) => !seen.has(id));
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
            <p role="alert">{error}</p>
            <button
              className="secondary-button"
              type="button"
              disabled={disabled}
              onClick={() => {
                setError(null);
                setRetry((previous) => previous + 1);
              }}
            >
              Retry
            </button>
          </>
        )}
        {!request && next && (
          <button
            className="secondary-button"
            type="button"
            disabled={disabled}
            onClick={() => {
              setRequest({ cursor: next });
            }}
          >
            Load more releases
          </button>
        )}
      </div>
    </>
  );
}
