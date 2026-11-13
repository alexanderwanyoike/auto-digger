import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DiscogsBridge, DiscogsError } from '../../shared/discogs';
import { emptyFilters } from '../../shared/default-filters';
import { maxSearchResults } from '../../shared/search-limits';
import type { SearchPage } from '../../shared/search';
import { useDiscogsRetry } from './use-discogs-retry';

type Releases = SearchPage['releases'];

export function useCatalogueRange({
  search,
  style,
  from,
  to,
  active,
  onUnauthorized,
}: {
  search: DiscogsBridge['search'];
  style: string;
  from: number;
  to: number;
  active: boolean;
  onUnauthorized: () => void;
}) {
  const [start, setStart] = useState(from);
  const [releases, setReleases] = useState<Releases>([]);
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState(0);
  const [pages, setPages] = useState(1);
  const [limited, setLimited] = useState(false);
  const [error, setError] = useState<DiscogsError | null>(null);
  const retry = useCallback(() => {
    setError(null);
  }, []);
  useDiscogsRetry(error?.retryAt, retry, active);
  const busy = !error && page > loaded;

  useEffect(() => {
    if (!busy) return undefined;
    let current = true;
    search({
      filters: { ...emptyFilters, style: [style], year: `${start.toString()}-${to.toString()}` },
      page,
      context: 'catalogue-range',
      order: 'oldest',
      background: page > 1,
    })
      .then((result) => {
        if (!current) return;
        if (!result.ok) {
          if (result.error.code === 'unauthorized') onUnauthorized();
          setError(result.error);
          return;
        }
        const incoming = result.value.releases.filter(({ year }) => {
          const date = Number(year);
          return Number.isInteger(date) && date >= start && date <= to;
        });
        setReleases((previous) => {
          const seen = new Set(previous.map(({ id }) => id));
          return [
            ...previous,
            ...incoming.filter(({ id }) => {
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            }),
          ];
        });
        setPages(result.value.pages);
        setLimited(result.value.items > maxSearchResults);
        setLoaded(page);
      })
      .catch(() => {
        if (current) setError({ code: 'network', message: 'Records could not be loaded.' });
      });
    return () => {
      current = false;
    };
  }, [busy, onUnauthorized, page, search, start, style, to]);

  const groups = useMemo(() => {
    const byYear = new Map<number, Releases>();
    releases.forEach((release) => {
      const year = Number(release.year);
      const group = byYear.get(year);
      if (group) group.push(release);
      else byYear.set(year, [release]);
    });
    return [...byYear.entries()].sort(([left], [right]) => left - right);
  }, [releases]);

  return {
    groups,
    start,
    limited,
    busy,
    error,
    retry,
    jump: (year: number) => {
      if (year === start) return;
      setStart(year);
      setReleases([]);
      setPage(1);
      setLoaded(0);
      setPages(1);
      setLimited(false);
      setError(null);
    },
    loadMore:
      !busy && !error && loaded < pages
        ? () => {
            setPage(loaded + 1);
          }
        : undefined,
  };
}
