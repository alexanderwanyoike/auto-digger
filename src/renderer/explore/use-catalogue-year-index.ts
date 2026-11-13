import { useEffect, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import { catalogueYears, firstSearchYear } from './catalogue-years';

export function useCatalogueYearIndex(
  search: DiscogsBridge['search'],
  style: string,
  onUnauthorized: () => void,
) {
  const [years, setYears] = useState<number[]>([]);
  const [start, setStart] = useState(firstSearchYear);
  const [next, setNext] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    catalogueYears(
      search,
      style,
      start,
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
  }, [attempt, onUnauthorized, search, start, style]);
  return {
    years,
    busy,
    error,
    hasMore: next !== null,
    loadMore: () => {
      if (busy || next === null || error) return;
      setBusy(true);
      setStart(next);
    },
    retry: () => {
      setBusy(true);
      setError(null);
      setAttempt((value) => value + 1);
    },
  };
}
