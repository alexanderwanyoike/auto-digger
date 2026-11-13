import { useEffect, useRef, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import { ReleaseMatchList } from '../discogs/ReleaseMatchList';
import { useCatalogueRecords } from './use-catalogue-records';
import { useCatalogueYearIndex } from './use-catalogue-year-index';

export function CatalogueTimeline({
  style,
  disabled,
  search,
  onOpen,
  onUnauthorized,
}: {
  style: string;
  disabled: boolean;
  search: DiscogsBridge['search'];
  onOpen: (id: number) => void;
  onUnauthorized: () => void;
}) {
  const index = useCatalogueYearIndex(search, style, onUnauthorized);
  const records = useCatalogueRecords(search, style, index.years[0], onUnauthorized);
  const [selected, setSelected] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const catalogue = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timeline = catalogue.current;
    const viewport = timeline?.closest<HTMLElement>('.explore-page');
    const toolbar = viewport?.querySelector('.explore-toolbar');
    if (!timeline || !viewport || !toolbar || disabled || !records.groups.length) return undefined;
    const update = () => {
      if (!timeline.getClientRects().length) return;
      const edge = toolbar.getBoundingClientRect().bottom + 12;
      const years = Array.from(timeline.querySelectorAll<HTMLElement>('[data-release-year]'));
      const atEnd =
        viewport.scrollTop > 0 &&
        viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 2;
      const year = atEnd
        ? years.at(-1)
        : years.find((group) => group.getBoundingClientRect().bottom > edge);
      if (year?.dataset.releaseYear) setSelected(Number(year.dataset.releaseYear));
    };
    update();
    viewport.addEventListener('scroll', update, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', update);
    };
  }, [disabled, records.groups]);

  const nextYear = index.years.find((year) => year > (records.lastYear ?? 0));
  const canLoadRecords = records.morePages || nextYear !== undefined;
  const hasMore = canLoadRecords || index.hasMore;
  const busy = records.busy || (!canLoadRecords && index.busy);
  const error = records.error ?? index.error;
  const loadMore = () => {
    if (canLoadRecords) records.loadMore(nextYear);
    else index.loadMore();
  };
  useEffect(() => {
    const element = sentinel.current;
    if (!element || busy || error || disabled || !hasMore) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        loadMore();
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  });

  const select = (year: number) => {
    setSelected(year);
    const section = catalogue.current?.querySelector(`[data-release-year="${year.toString()}"]`);
    if (section) section.scrollIntoView({ block: 'start' });
    else {
      records.jump(year);
      catalogue.current?.scrollIntoView({ block: 'start' });
    }
  };

  return (
    <div className="catalogue-timeline" ref={catalogue}>
      <nav aria-label="Release years" className="catalogue-years">
        <ol>
          {index.years.map((year) => (
            <li key={year}>
              <button
                type="button"
                aria-current={year === (selected ?? index.years[0]) ? true : undefined}
                disabled={disabled}
                onClick={() => {
                  select(year);
                }}
              >
                {year}
              </button>
            </li>
          ))}
        </ol>
        {index.hasMore && !index.error && (
          <button
            className="secondary-button"
            type="button"
            disabled={disabled || index.busy}
            onClick={index.loadMore}
          >
            More years
          </button>
        )}
      </nav>
      <div className="catalogue-records">
        {records.groups.map(({ year, releases }) => (
          <section
            key={year}
            className="explore-shelf catalogue-year"
            aria-label={year.toString()}
            data-release-year={year}
          >
            <header className="explore-shelf-header">
              <h3>{year}</h3>
            </header>
            <ReleaseMatchList releases={releases} disabled={disabled} onOpen={onOpen} />
          </section>
        ))}
        <div ref={sentinel} className="catalogue-continuation">
          {busy && <p role="status">Loading releases…</p>}
          {!busy && !records.groups.length && !error && <p>No dated releases found.</p>}
          {error && <p role="alert">{error}</p>}
          {error && (
            <button
              className="secondary-button"
              type="button"
              onClick={records.error ? records.retry : index.retry}
            >
              Retry
            </button>
          )}
          {!busy && !error && hasMore && (
            <button className="secondary-button" type="button" onClick={loadMore}>
              Load more releases
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
