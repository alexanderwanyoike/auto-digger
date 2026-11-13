import { useEffect, useRef, useState } from 'react';
import type { YearRecords } from './use-catalogue-records';
import type { DiscogsBridge } from '../../shared/discogs';
import { CatalogueStylePicker } from './CatalogueStylePicker';
import { CatalogueRangeTimeline } from './CatalogueRangeTimeline';
import { CatalogueYearForm } from './CatalogueYearForm';
import { CatalogueTimeline } from './CatalogueTimeline';
import { starterStyle } from '../../shared/discovery';
import { catalogueStyles } from './catalogue-years';

export function CataloguePage({
  bridge,
  busy,
  active,
  onOpen,
  onPreview,
  previewBusy,
  onShowYear,
  onUnauthorized,
}: {
  bridge: DiscogsBridge;
  busy: boolean;
  active: boolean;
  onOpen: (id: number) => void;
  onPreview: ((id: number) => void) | undefined;
  previewBusy: boolean;
  onShowYear: (style: string, year: number, group?: YearRecords) => void;
  onUnauthorized: () => void;
}) {
  const [preferred, setPreferred] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const section = useRef<HTMLElement>(null);
  const [jump, setJump] = useState<{ from: number; to: number | undefined; revision: number }>();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    const load = bridge.crateStyles;
    if (!load) return undefined;
    load()
      .then((result) => {
        if (!current) return;
        if (result.ok) setPreferred(result.value);
        else {
          setError(result.error.message);
          setPreferred([]);
        }
      })
      .catch(() => {
        if (!current) return;
        setError('Saved styles could not be loaded.');
        setPreferred([]);
      });
    return () => {
      current = false;
    };
  }, [bridge]);
  const styles = catalogueStyles(preferred ?? []);
  const style = selected ?? styles.find((value) => preferred?.includes(value)) ?? starterStyle;
  const resetScroll = () => {
    section.current?.closest('.explore-scroll')?.scrollTo(0, 0);
  };
  const ready = preferred !== null || !bridge.crateStyles || selected !== null;
  const timelineKey = `${style}:${jump?.revision.toString() ?? ''}`;
  return (
    <section ref={section} className="catalogue-page" aria-labelledby="catalogue-heading">
      <header className="catalogue-header">
        <h2 id="catalogue-heading" className="sr-only">
          Catalogue
        </h2>
        <CatalogueStylePicker
          disabled={busy}
          style={style}
          styles={styles}
          onChange={(next) => {
            if (next === style) return;
            setSelected(next);
            setJump(undefined);
            resetScroll();
          }}
        />
        <CatalogueYearForm
          key={style}
          disabled={busy}
          onApply={(from, to) => {
            resetScroll();
            setJump((previous) => ({ from, to, revision: (previous?.revision ?? 0) + 1 }));
          }}
        />
      </header>
      {error && <p role="alert">{error}</p>}
      {ready && jump?.to !== undefined && (
        <CatalogueRangeTimeline
          key={timelineKey}
          from={jump.from}
          to={jump.to}
          style={style}
          disabled={busy}
          active={active}
          search={bridge.search}
          onOpen={onOpen}
          onPreview={onPreview}
          previewBusy={previewBusy}
          onShowYear={onShowYear}
          onUnauthorized={onUnauthorized}
        />
      )}
      {ready && jump?.to === undefined && (
        <CatalogueTimeline
          key={timelineKey}
          jumpYear={jump?.from}
          style={style}
          disabled={busy}
          active={active}
          search={bridge.search}
          onOpen={onOpen}
          onPreview={onPreview}
          previewBusy={previewBusy}
          onShowYear={onShowYear}
          onUnauthorized={onUnauthorized}
        />
      )}
    </section>
  );
}
