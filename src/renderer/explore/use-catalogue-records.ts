import { useCallback, useEffect, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import type { SearchPage } from '../../shared/search';
import { recordsForYear } from './catalogue-years';
import { useDiscogsRetry } from './use-discogs-retry';

export interface YearRecords {
  year: number;
  page: number;
  pages: number;
  releases: SearchPage['releases'];
}

export function useCatalogueRecords(
  search: DiscogsBridge['search'],
  style: string,
  firstYear: number | undefined,
  onUnauthorized: () => void,
  initialGroup?: YearRecords,
  activeView = true,
) {
  const [groups, setGroups] = useState<YearRecords[]>(() => (initialGroup ? [initialGroup] : []));
  const [request, setRequest] = useState<{
    year: number;
    page: number;
    background?: boolean;
  } | null>(null);
  const [failed, setFailed] = useState<{ year: number; page: number; background?: boolean } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState<number>();
  const initial = groups.length === 0 && !error;
  const year = request?.year ?? (initial ? firstYear : undefined);
  const page = request?.page ?? 1;
  const background = request?.background ?? false;
  const retry = useCallback(() => {
    setRetryAt(undefined);
    setError(null);
    setRequest(failed);
  }, [failed]);
  useDiscogsRetry(retryAt, retry, activeView);

  useEffect(() => {
    if (year === undefined) return undefined;
    let active = true;
    recordsForYear(search, style, year, page, background)
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setGroups((current) => {
            const currentYear = current.at(-1);
            if (currentYear?.year !== year) {
              return [
                ...current,
                { year, page, pages: result.value.pages, releases: result.value.releases },
              ];
            }
            const seen = new Set(currentYear.releases.map(({ id }) => id));
            return [
              ...current.slice(0, -1),
              {
                year,
                page,
                pages: result.value.pages,
                releases: [
                  ...currentYear.releases,
                  ...result.value.releases.filter(({ id }) => !seen.has(id)),
                ],
              },
            ];
          });
        } else {
          if (result.error.code === 'unauthorized') onUnauthorized();
          setFailed({ year, page, background });
          setRetryAt(result.error.retryAt);
          setError(result.error.message);
        }
        setRequest(null);
      })
      .catch(() => {
        if (!active) return;
        setFailed({ year, page, background });
        setError('Records could not be loaded.');
        setRequest(null);
      });
    return () => {
      active = false;
    };
  }, [background, onUnauthorized, page, search, style, year]);

  const last = groups.at(-1);
  const morePages = Boolean(last && last.page < last.pages);
  return {
    groups,
    busy: year !== undefined,
    error,
    retryAt,
    lastYear: last?.year,
    morePages,
    jump: (target: number) => {
      setGroups([]);
      setRetryAt(undefined);
      setError(null);
      setRequest({ year: target, page: 1 });
    },
    loadMore: (nextYear: number | undefined) => {
      if (year !== undefined || error) return;
      if (morePages && last) {
        setRequest({ year: last.year, page: last.page + 1, background: true });
      } else if (nextYear !== undefined) {
        setRequest({ year: nextYear, page: 1, background: true });
      }
    },
    retry,
  };
}
