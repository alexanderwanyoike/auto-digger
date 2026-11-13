import { useCallback, useEffect, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import { catalogueYears, firstSearchYear } from './catalogue-years';
import { useDiscogsRetry } from './use-discogs-retry';

export function useCatalogueYearIndex(
  search: DiscogsBridge['search'],
  style: string,
  onUnauthorized: () => void,
  activeView: boolean,
) {
  const [years, setYears] = useState<number[]>([]);
  const [start, setStart] = useState(firstSearchYear);
  const [next, setNext] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retryAt, setRetryAt] = useState<number>();
  const retry = useCallback(() => {
    setBusy(true);
    setError(null);
    setRetryAt(undefined);
    setAttempt((value) => value + 1);
  }, []);
  useDiscogsRetry(retryAt, retry, activeView);
  useEffect(() => {
    let active = true;
    catalogueYears(
      search,
      style,
      start,
      start === firstSearchYear ? 2 : 1,
      () => active,
      (year) => {
        setYears((previous) => (previous.includes(year) ? previous : [...previous, year]));
      },
    )
      .then((result) => {
        if (!active) return;
        if (result.ok) setNext(result.value);
        else {
          if (result.error.code === 'unauthorized') onUnauthorized();
          setRetryAt(result.error.retryAt);
          setError(result.error.message);
        }
      })
      .catch(() => {
        if (active) setError('Release years could not be loaded.');
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, onUnauthorized, search, start, style]);
  const loadMore = useCallback(() => {
    if (busy || next === null || error) return;
    setBusy(true);
    setStart(next);
  }, [busy, error, next]);
  return {
    years,
    busy,
    error,
    retryAt,
    hasMore: next !== null,
    loadMore,
    retry,
  };
}
