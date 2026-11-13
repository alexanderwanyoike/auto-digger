import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import type { SearchPage } from '../../shared/search';
import { ReleaseMatchList } from '../discogs/ReleaseMatchList';
import { catalogueYears, firstSearchYear, recordsForYear } from './catalogue-years';

const shelfSize = 4;

export function CatalogueTimeline({
  style,
  search,
  onOpen,
  onUnauthorized,
}: {
  style: string;
  search: DiscogsBridge['search'];
  onOpen: (id: number) => void;
  onUnauthorized: () => void;
}) {
  const timeline = useRef<HTMLDivElement>(null);
  const yearPosition = useRef(0);
  const [years, setYears] = useState<number[]>([]);
  const [start, setStart] = useState(firstSearchYear);
  const [next, setNext] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [grid, setGrid] = useState(false);
  const [matches, setMatches] = useState<SearchPage | null>(null);
  const [yearsBusy, setYearsBusy] = useState(true);
  const [yearsError, setYearsError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useLayoutEffect(() => {
    if (!grid && timeline.current) timeline.current.scrollTop = yearPosition.current;
  }, [grid]);
  useEffect(() => {
    let active = true;
    catalogueYears(
      search,
      style,
      start,
      () => active,
      (found) => {
        setYears((previous) => (previous.includes(found) ? previous : [...previous, found]));
        setYear((previous) => previous ?? found);
      },
    )
      .then((result) => {
        if (!active) return;
        if (result.ok) setNext(result.value);
        else {
          if (result.error.code === 'unauthorized') onUnauthorized();
          setYearsError(result.error.message);
        }
      })
      .catch(() => {
        if (active) setYearsError('Release years could not be loaded.');
      })
      .finally(() => {
        if (active) setYearsBusy(false);
      });
    return () => {
      active = false;
    };
  }, [onUnauthorized, retry, search, start, style]);

  useEffect(() => {
    if (year === null) return undefined;
    let active = true;
    recordsForYear(search, style, year, page)
      .then((result) => {
        if (!active) return;
        if (result.ok) setMatches(result.value);
        else {
          if (result.error.code === 'unauthorized') onUnauthorized();
          setRecordsError(result.error.message);
        }
      })
      .catch(() => {
        if (active) setRecordsError('Records could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [onUnauthorized, page, retry, search, style, year]);

  const changePage = (nextPage: number) => {
    if (page !== nextPage) {
      setMatches(null);
      setRecordsError(null);
      setPage(nextPage);
    }
  };

  return (
    <>
      <div className="catalogue-timeline" hidden={grid}>
        <nav aria-label="Release years" className="catalogue-years" ref={timeline}>
          <ol>
            {years.map((value) => (
              <li key={value}>
                <button
                  type="button"
                  aria-current={value === year ? true : undefined}
                  onClick={() => {
                    if (year !== value) {
                      setMatches(null);
                      setRecordsError(null);
                      setPage(1);
                      setYear(value);
                    }
                  }}
                >
                  {value}
                </button>
              </li>
            ))}
          </ol>
          {yearsBusy && <p role="status">Loading years…</p>}
          {next !== null && !yearsBusy && !yearsError && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setYearsBusy(true);
                setStart(next);
              }}
            >
              More years
            </button>
          )}
          {!yearsBusy && !years.length && !yearsError && <p>No dated releases found.</p>}
        </nav>
        <section
          className="explore-shelf catalogue-year-shelf"
          aria-label={year?.toString() ?? 'Releases'}
        >
          {year !== null && (
            <header className="explore-shelf-header">
              <h3>{year}</h3>
              {matches && matches.items > shelfSize && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    yearPosition.current = timeline.current?.scrollTop ?? 0;
                    setGrid(true);
                  }}
                >
                  Show more
                </button>
              )}
            </header>
          )}
          {year !== null && !matches && !recordsError && <p role="status">Loading releases…</p>}
          {matches && (
            <ReleaseMatchList
              releases={matches.releases.slice(0, shelfSize)}
              disabled={false}
              onOpen={onOpen}
            />
          )}
        </section>
      </div>
      {grid && (
        <section
          className="explore-shelf catalogue-full-grid"
          aria-label={`${style} · ${year?.toString() ?? ''}`}
        >
          <header className="explore-shelf-header">
            <h3>
              {style} · {year}
            </h3>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                changePage(1);
                setGrid(false);
              }}
            >
              Back to timeline
            </button>
          </header>
          {matches && (
            <ReleaseMatchList releases={matches.releases} disabled={false} onOpen={onOpen} />
          )}
          {!matches && !recordsError && <p role="status">Loading releases…</p>}
          {matches && matches.pages > 1 && (
            <nav className="catalogue-pagination" aria-label="Year pages">
              <button
                className="secondary-button"
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  changePage(page - 1);
                }}
              >
                Previous page
              </button>
              <span>
                Page {page} of {matches.pages}
              </span>
              <button
                className="secondary-button"
                type="button"
                disabled={page >= matches.pages}
                onClick={() => {
                  changePage(page + 1);
                }}
              >
                Next page
              </button>
            </nav>
          )}
        </section>
      )}
      {(yearsError ?? recordsError) && (
        <div className="catalogue-error">
          <p role="alert">{recordsError ?? yearsError}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              if (yearsError) setYearsBusy(true);
              setYearsError(null);
              setRecordsError(null);
              setRetry((current) => current + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
}
