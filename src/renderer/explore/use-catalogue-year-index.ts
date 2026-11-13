import { useCallback, useEffect, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import { catalogueYears, firstSearchYear } from './catalogue-years';

export function useCatalogueYearIndex(
  search: DiscogsBridge['search'],
  style: string,
  onUnauthorized: () => void,
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
        setYears((previous) => (previous.includes(year) ? previous : [...previous, year]));
      },
    )
      .then((result) => {
        if (!active) return;
        if (result.ok) setNext(result.value);
        else {
          if (result.error.code === 'unauthorized') onUnauthorized();
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
    hasMore: next !== null,
    loadMore,
    retry: () => {
      setBusy(true);
      setError(null);
      setAttempt((value) => value + 1);
    },
  };
}
