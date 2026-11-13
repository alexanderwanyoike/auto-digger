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
  jumpYear,
  disabled,
  active,
  search,
  onOpen,
  onPreview,
  previewBusy,
  onShowYear,
  onUnauthorized,
}: {
  style: string;
  jumpYear: number | undefined;
  disabled: boolean;
  active: boolean;
  search: DiscogsBridge['search'];
  onOpen: (id: number) => void;
  onPreview: ((id: number) => void) | undefined;
  previewBusy: boolean;
  onShowYear: (style: string, group: YearRecords) => void;
  onUnauthorized: () => void;
}) {
  const [jumpLoaded, setJumpLoaded] = useState(false);
  const index = useCatalogueYearIndex(search, style, onUnauthorized, active, jumpYear, jumpLoaded);
  const records = useCatalogueRecords(
    search,
    style,
    jumpYear ?? index.years[0],
    onUnauthorized,
    undefined,
    active,
  );
  useEffect(() => {
    if (jumpYear !== undefined && records.groups.some(({ year }) => year === jumpYear))
      setJumpLoaded(true);
  }, [jumpYear, records.groups]);
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
  const yearRetryAt = canLoadRecords ? undefined : index.retryAt;
  const retryAt = records.error ? records.retryAt : yearRetryAt;
  const loadMore = () => {
    if (canLoadRecords) records.loadMore(nextYear);
    else index.loadMore();
  };
  const sentinel = useScrollContinuation(
    exploring && !busy && !error && !disabled && hasMore ? loadMore : undefined,
  );
  useEffect(() => {
    const viewport = catalogue.current?.closest<HTMLElement>('.explore-scroll');
    if (!viewport || disabled) return undefined;
    const forward = () => {
      if (catalogue.current?.getClientRects().length) setExploring(true);
    };
    const wheel = (event: WheelEvent) => {
      if (
        event.deltaY > 0 &&
        !event.ctrlKey &&
        event.target instanceof Node &&
        !yearRail.current?.contains(event.target)
      )
        forward();
    };
    let touchY: number | undefined;
    const startTouch = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY;
    };
    const moveTouch = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (touchY !== undefined && y !== undefined && touchY - y >= 24) {
        touchY = undefined;
        if (event.target instanceof Node && yearRail.current?.contains(event.target))
          yearRail.current.dispatchEvent(new Event('scroll-forward'));
        else forward();
      }
    };
    viewport.addEventListener('scroll-forward', forward);
    viewport.addEventListener('wheel', wheel, { passive: true });
    viewport.addEventListener('touchstart', startTouch, { passive: true });
    viewport.addEventListener('touchmove', moveTouch, { passive: true });
    return () => {
      viewport.removeEventListener('scroll-forward', forward);
      viewport.removeEventListener('wheel', wheel);
      viewport.removeEventListener('touchstart', startTouch);
      viewport.removeEventListener('touchmove', moveTouch);
    };
  }, [disabled]);

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
    const forward = () => {
      if (rail.scrollHeight - rail.clientHeight - rail.scrollTop <= 40) loadMoreYears();
    };
    rail.addEventListener('scroll-forward', forward);
    rail.addEventListener('wheel', wheel, { passive: false });
    return () => {
      rail.removeEventListener('scroll-forward', forward);
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
              {index.years
                .filter(
                  (year) =>
                    !records.groups.some((group) => group.year === year && !group.releases.length),
                )
                .map((year) => (
                  <li key={year}>
                    <button
                      type="button"
                      aria-current={
                        year === (selected ?? jumpYear ?? index.years[0]) ? true : undefined
                      }
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
            {index.error && canLoadRecords && index.retryAt === undefined && (
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
        {records.groups
          .filter(({ releases }) => releases.length)
          .map((group) => (
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
          {!busy && !error && records.groups.every(({ releases }) => !releases.length) && (
            <p>
              {jumpYear
                ? `No releases found for ${jumpYear.toString()}.`
                : 'No dated releases found.'}
            </p>
          )}
          {error && <p role={retryAt === undefined ? 'alert' : 'status'}>{error}</p>}
          {error && retryAt === undefined && (
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
