import { useCallback, useEffect, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import { catalogueYear, catalogueYears, firstSearchYear, lastSearchYear } from './catalogue-years';

export function useCatalogueYearIndex(
  search: DiscogsBridge['search'],
  style: string,
  onUnauthorized: () => void,
  jumpYear?: number,
  jumpLoaded = false,
) {
  const [years, setYears] = useState<number[]>(() => (jumpYear === undefined ? [] : [jumpYear]));
  const [start, setStart] = useState(firstSearchYear);
  const [next, setNext] = useState<number | null>(
    jumpYear === undefined || jumpYear >= lastSearchYear ? null : jumpYear + 1,
  );
  const [busy, setBusy] = useState(jumpYear === undefined);
  const [error, setError] = useState<string | null>(null);
  const [previousYear, setPreviousYear] = useState<number | null>(null);
  useEffect(() => {
    if (jumpYear === undefined || !jumpLoaded) return undefined;
    let active = true;
    catalogueYear(search, style, firstSearchYear, jumpYear - 1, 'newest')
      .then((result) => {
        if (active && result.ok) setPreviousYear(result.value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [jumpLoaded, jumpYear, search, style]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (jumpYear !== undefined && start === firstSearchYear) {
      if (jumpLoaded && jumpYear < lastSearchYear) {
        setBusy(true);
        setStart(jumpYear + 1);
      }
      return undefined;
    }
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
  }, [attempt, jumpLoaded, jumpYear, onUnauthorized, search, start, style]);
  const loadMore = useCallback(() => {
    if (busy || next === null || error) return;
    setBusy(true);
    setStart(next);
  }, [busy, error, next]);
  return {
    years: previousYear === null ? years : [previousYear, ...years],
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
