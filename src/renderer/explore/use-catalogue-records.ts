import { useEffect, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import type { SearchPage } from '../../shared/search';
import { recordsForYear } from './catalogue-years';

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
) {
  const [groups, setGroups] = useState<YearRecords[]>(() => (initialGroup ? [initialGroup] : []));
  const [request, setRequest] = useState<{ year: number; page: number } | null>(null);
  const [failed, setFailed] = useState<{ year: number; page: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initial = groups.length === 0 && !error;
  const year = request?.year ?? (initial ? firstYear : undefined);
  const page = request?.page ?? 1;

  useEffect(() => {
    if (year === undefined) return undefined;
    let active = true;
    recordsForYear(search, style, year, page)
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
          setFailed({ year, page });
          setError(result.error.message);
        }
        setRequest(null);
      })
      .catch(() => {
        if (!active) return;
        setFailed({ year, page });
        setError('Records could not be loaded.');
        setRequest(null);
      });
    return () => {
      active = false;
    };
  }, [onUnauthorized, page, search, style, year]);

  const last = groups.at(-1);
  const morePages = Boolean(last && last.page < last.pages);
  return {
    groups,
    busy: year !== undefined,
    error,
    lastYear: last?.year,
    morePages,
    jump: (target: number) => {
      setGroups([]);
      setError(null);
      setRequest({ year: target, page: 1 });
    },
    loadMore: (nextYear: number | undefined) => {
      if (year !== undefined || error) return;
      if (morePages && last) {
        setRequest({ year: last.year, page: last.page + 1 });
      } else if (nextYear !== undefined) {
        setRequest({ year: nextYear, page: 1 });
      }
    },
    retry: () => {
      setError(null);
      setRequest(failed);
    },
  };
}
