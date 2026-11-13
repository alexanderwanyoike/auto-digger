import { useEffect, useRef, useState } from 'react';
import type { YearRecords } from './use-catalogue-records';
import type { DiscogsBridge } from '../../shared/discogs';
import { TickScrollbar } from './TickScrollbar';
import { ReleaseMatchList } from '../discogs/ReleaseMatchList';
import { useCatalogueRecords } from './use-catalogue-records';
import { useScrollContinuation } from './use-scroll-continuation';
import { useCatalogueYearIndex } from './use-catalogue-year-index';

export function CatalogueTimeline({
  style,
  disabled,
  search,
  onOpen,
  onPreview,
  previewBusy,
  onShowYear,
  onUnauthorized,
}: {
  style: string;
  disabled: boolean;
  search: DiscogsBridge['search'];
  onOpen: (id: number) => void;
  onPreview: ((id: number) => void) | undefined;
  previewBusy: boolean;
  onShowYear: (style: string, group: YearRecords) => void;
  onUnauthorized: () => void;
}) {
  const index = useCatalogueYearIndex(search, style, onUnauthorized);
  const records = useCatalogueRecords(search, style, index.years[0], onUnauthorized);
  const [exploring, setExploring] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const catalogue = useRef<HTMLDivElement>(null);
  const yearRail = useRef<HTMLElement>(null);
  const yearRailContent = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rail = yearRail.current;
    const button = rail?.querySelector('[aria-current="true"]');
    if (!rail || !button) return;
    const visible = rail.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    if (target.top < visible.top) rail.scrollBy(0, target.top - visible.top);
    if (target.bottom > visible.bottom) rail.scrollBy(0, target.bottom - visible.bottom);
  }, [selected]);
  useEffect(() => {
    const timeline = catalogue.current;
    const viewport = timeline?.closest<HTMLElement>('.explore-scroll');
    if (!timeline || !viewport || disabled || !records.groups.length) return undefined;
    const update = () => {
      if (!timeline.getClientRects().length) return;
      if (viewport.scrollTop > 0) setExploring(true);
      const inset = parseFloat(getComputedStyle(timeline).scrollMarginTop);
      const edge = viewport.getBoundingClientRect().top + inset;
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
  const error = records.error ?? (canLoadRecords ? null : index.error);
  const loadMore = () => {
    if (canLoadRecords) records.loadMore(nextYear);
    else index.loadMore();
  };
  const sentinel = useScrollContinuation(
    exploring && !busy && !error && !disabled && hasMore ? loadMore : undefined,
  );
  useEffect(() => {
    const viewport = catalogue.current?.closest<HTMLElement>('.explore-scroll');
    if (!viewport || exploring || disabled) return undefined;
    const wheel = (event: WheelEvent) => {
      if (event.deltaY > 0 && !event.ctrlKey && !yearRail.current?.contains(event.target as Node))
        setExploring(true);
    };
    viewport.addEventListener('wheel', wheel, { passive: true });
    return () => {
      viewport.removeEventListener('wheel', wheel);
    };
  }, [disabled, exploring]);

  const { loadMore: loadMoreYears } = index;
  const extendYearRail = (rail: HTMLElement) => {
    if (!disabled && rail.scrollHeight - rail.clientHeight - rail.scrollTop <= 40) loadMoreYears();
  };
  useEffect(() => {
    const rail = yearRail.current;
    if (!rail || disabled || !index.hasMore || index.busy || index.error) return undefined;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY <= 0 || rail.scrollHeight > rail.clientHeight) return;
      event.preventDefault();
      loadMoreYears();
    };
    rail.addEventListener('wheel', wheel, { passive: false });
    return () => {
      rail.removeEventListener('wheel', wheel);
    };
  }, [disabled, index.busy, index.error, index.hasMore, loadMoreYears]);

  const select = (year: number) => {
    setExploring(true);
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
      <div className="catalogue-years-frame">
        <nav
          aria-label="Release years"
          className="catalogue-years"
          ref={yearRail}
          onScroll={(event) => {
            extendYearRail(event.currentTarget);
          }}
        >
          <div ref={yearRailContent}>
            <ol>
              {index.years.map((year) => (
                <li key={year}>
                  <button
                    type="button"
                    aria-current={year === (selected ?? index.years[0]) ? true : undefined}
                    disabled={disabled}
                    onKeyDown={(event) => {
                      const rail = yearRail.current;
                      if (rail && year === index.years.at(-1) && event.key === 'ArrowDown')
                        extendYearRail(rail);
                    }}
                    onClick={() => {
                      select(year);
                    }}
                  >
                    {year}
                  </button>
                </li>
              ))}
            </ol>
            {index.error && canLoadRecords && (
              <button className="secondary-button" type="button" onClick={index.retry}>
                Retry years
              </button>
            )}
          </div>
        </nav>
        <TickScrollbar
          viewport={yearRail}
          content={yearRailContent}
          label="Catalogue years scroll position"
        />
      </div>
      <div className="catalogue-records">
        {records.groups.map((group) => (
          <section
            key={group.year}
            className="explore-shelf catalogue-year"
            aria-label={group.year.toString()}
            data-release-year={group.year}
          >
            <header className="explore-shelf-header">
              <h3>{group.year}</h3>
              <button
                type="button"
                id={`explore-year-more-${group.year.toString()}`}
                className="explore-show-more"
                disabled={disabled}
                onClick={() => {
                  onShowYear(style, group);
                }}
              >
                Show more
              </button>
            </header>
            <ReleaseMatchList
              releases={group.releases}
              disabled={disabled}
              onOpen={onOpen}
              onPreview={onPreview}
              previewBusy={previewBusy}
            />
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
        </div>
      </div>
    </div>
  );
}
