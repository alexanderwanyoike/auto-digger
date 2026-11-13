import { useEffect, useRef, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import { CatalogueYearShelf } from './CatalogueYearShelf';
import { TickScrollbar } from './TickScrollbar';
import { catalogueScrollYear } from './catalogue-scroll-year';
import { useRevealCatalogueYear } from './use-reveal-catalogue-year';
import { useCatalogueRange } from './use-catalogue-range';
import { useScrollContinuation } from './use-scroll-continuation';

export function CatalogueRangeTimeline({
  style,
  from,
  to,
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
  from: number;
  to: number;
  disabled: boolean;
  active: boolean;
  search: DiscogsBridge['search'];
  onOpen: (id: number) => void;
  onPreview: ((id: number) => void) | undefined;
  previewBusy: boolean;
  onShowYear: (style: string, year: number) => void;
  onUnauthorized: () => void;
}) {
  const { groups, start, limited, busy, error, retry, jump, loadMore } = useCatalogueRange({
    search,
    style,
    from,
    to,
    active: active && !disabled,
    onUnauthorized,
  });
  const years = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  const timeline = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLElement>(null);
  const railContent = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number>();
  const [requestedYear, setRequestedYear] = useState<number>();
  const jumpPosition = useRef<number | undefined>(undefined);
  const sentinel = useScrollContinuation(active && !disabled ? loadMore : undefined);

  useEffect(() => {
    const content = timeline.current;
    const viewport = content?.closest<HTMLElement>('.explore-scroll');
    if (!active || !content || !viewport || !groups.length) return undefined;
    const update = () => {
      if (jumpPosition.current === viewport.scrollTop) return;
      jumpPosition.current = undefined;
      const year = catalogueScrollYear(content, viewport);
      if (year !== undefined) setSelected(year);
    };
    update();
    viewport.addEventListener('scroll', update, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', update);
    };
  }, [active, groups]);

  const currentYear = selected ?? start;
  const firstYear = groups[0]?.[0];
  useRevealCatalogueYear(rail, currentYear);

  return (
    <div className="catalogue-timeline" ref={timeline}>
      <div className="catalogue-years-frame">
        <nav className="catalogue-years" aria-label="Release years" ref={rail}>
          <div ref={railContent}>
            <ol>
              {years.map((year) => (
                <li key={year}>
                  <button
                    type="button"
                    aria-current={year === currentYear ? true : undefined}
                    disabled={disabled}
                    onClick={() => {
                      const content = timeline.current;
                      const viewport = content?.closest<HTMLElement>('.explore-scroll');
                      const section = content?.querySelector(
                        `[data-release-year="${year.toString()}"]`,
                      );
                      if (!viewport) return;
                      if (section) {
                        section.scrollIntoView({ block: 'start', behavior: 'instant' });
                        jumpPosition.current = viewport.scrollTop;
                        setSelected(year);
                        return;
                      }
                      setRequestedYear(year);
                      jumpPosition.current = undefined;
                      viewport.scrollTo(0, 0);
                      setSelected(year);
                      jump(year);
                    }}
                  >
                    {year}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </nav>
        <TickScrollbar
          viewport={rail}
          content={railContent}
          label="Catalogue years scroll position"
        />
      </div>
      <div className="catalogue-records">
        {limited && (
          <p className="catalogue-range-status" role="status">
            Discogs shows the first 10,000 matches. Jump to a later year or narrow the range.
          </p>
        )}
        {requestedYear === start && firstYear !== undefined && firstYear > start && (
          <p className="catalogue-range-status" role="status">
            No releases found for {start}.
          </p>
        )}
        {groups.map(([year, releases]) => (
          <CatalogueYearShelf
            key={year}
            year={year}
            releases={releases}
            disabled={disabled}
            onOpen={onOpen}
            onPreview={onPreview}
            previewBusy={previewBusy}
            onShowMore={() => {
              onShowYear(style, year);
            }}
          />
        ))}
        <div className="catalogue-continuation" ref={sentinel}>
          {busy && <p role="status">Loading releases…</p>}
          {!busy && !error && !loadMore && !groups.length && (
            <p>
              {start === to
                ? `No releases found for ${start.toString()}.`
                : `No releases found from ${start.toString()} to ${to.toString()}.`}
            </p>
          )}
          {error && <p role={error.retryAt === undefined ? 'alert' : 'status'}>{error.message}</p>}
          {error && error.retryAt === undefined && (
            <button className="secondary-button" type="button" onClick={retry}>
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
