import { useEffect, useRef, useState } from 'react';
import type { YearRecords } from './use-catalogue-records';
import type { DiscogsBridge } from '../../shared/discogs';
import { TickScrollbar } from './TickScrollbar';
import { catalogueScrollYear } from './catalogue-scroll-year';
import { useRevealCatalogueYear } from './use-reveal-catalogue-year';
import { CatalogueYearShelf } from './CatalogueYearShelf';
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
  onShowYear: (style: string, year: number, group: YearRecords) => void;
  onUnauthorized: () => void;
}) {
  const [jumpResult, setJumpResult] = useState<{ empty: boolean }>();
  const index = useCatalogueYearIndex(
    search,
    style,
    onUnauthorized,
    active,
    jumpYear,
    jumpResult !== undefined,
  );
  const records = useCatalogueRecords(
    search,
    style,
    jumpYear ?? index.years[0],
    onUnauthorized,
    undefined,
    active,
  );
  useEffect(() => {
    if (jumpYear === undefined || jumpResult !== undefined) return;
    const group = records.groups.find(({ year }) => year === jumpYear);
    if (group) setJumpResult({ empty: !group.releases.length });
  }, [jumpResult, jumpYear, records.groups]);
  useEffect(() => {
    if (jumpYear === undefined || jumpResult !== undefined) return;
    const group = records.groups.find(({ year }) => year === jumpYear);
    if (group) setJumpResult({ empty: !group.releases.length });
  }, [jumpResult, jumpYear, records.groups]);
  const [exploring, setExploring] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const catalogue = useRef<HTMLDivElement>(null);
  const yearRail = useRef<HTMLElement>(null);
  const yearRailContent = useRef<HTMLDivElement>(null);
  useRevealCatalogueYear(yearRail, selected);
  useEffect(() => {
    const timeline = catalogue.current;
    const viewport = timeline?.closest<HTMLElement>('.explore-scroll');
    if (!timeline || !viewport || disabled || !records.groups.length) return undefined;
    const update = () => {
      if (!timeline.getClientRects().length) return;
      if (viewport.scrollTop > 0) setExploring(true);
      const year = catalogueScrollYear(timeline, viewport);
      if (year !== undefined) setSelected(year);
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
            {index.previousError && (
              <button className="secondary-button" type="button" onClick={index.retryPrevious}>
                Retry earlier year
              </button>
            )}
            <ol>
              {index.years
                .filter((year) => !(year === jumpYear && jumpResult?.empty))
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
            <CatalogueYearShelf
              key={group.year}
              year={group.year}
              releases={group.releases}
              disabled={disabled}
              onOpen={onOpen}
              onPreview={onPreview}
              previewBusy={previewBusy}
              onShowMore={() => {
                onShowYear(style, group.year, group);
              }}
            />
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
