import { useCallback, useEffect, useRef, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import { catalogueYears, firstSearchYear } from './catalogue-years';
import { useDiscogsRetry } from './use-discogs-retry';

export function useCatalogueYearIndex(
  search: DiscogsBridge['search'],
  style: string,
  onUnauthorized: () => void,
  activeView: boolean,
  jumpYear?: number,
) {
  const [years, setYears] = useState<number[]>(() => (jumpYear === undefined ? [] : [jumpYear]));
  const [start, setStart] = useState(firstSearchYear);
  const [next, setNext] = useState<number | null>(
    jumpYear === undefined || jumpYear >= 9999 ? null : jumpYear + 1,
  );
  const [busy, setBusy] = useState(jumpYear === undefined);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retryAt, setRetryAt] = useState<number>();
  const lastCompletedYear = useRef<number | undefined>(undefined);
  const retry = useCallback(() => {
    setBusy(true);
    setError(null);
    setRetryAt(undefined);
    const completed = lastCompletedYear.current;
    if (completed !== undefined) setStart(completed + 1);
    setAttempt((value) => value + 1);
  }, []);
  useDiscogsRetry(retryAt, retry, activeView);
  useEffect(() => {
    if (jumpYear !== undefined && start === firstSearchYear) return undefined;
    let active = true;
    catalogueYears(
      search,
      style,
      start,
      start === firstSearchYear ? 2 : 1,
      () => active,
      (year) => {
        lastCompletedYear.current = year;
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
  }, [attempt, jumpYear, onUnauthorized, search, start, style]);
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
