import { useEffect, useState } from 'react';
import type { YearRecords } from './use-catalogue-records';
import type { DiscogsBridge } from '../../shared/discogs';
import { CatalogueStylePicker } from './CatalogueStylePicker';
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
  onShowYear: (style: string, group: YearRecords) => void;
  onUnauthorized: () => void;
}) {
  const [preferred, setPreferred] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [year, setYear] = useState('');
  const [jumpYear, setJumpYear] = useState<number>();
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
  return (
    <section className="catalogue-page" aria-labelledby="catalogue-heading">
      <header className="catalogue-header">
        <h2 id="catalogue-heading" className="sr-only">
          Catalogue
        </h2>
        <CatalogueStylePicker
          disabled={busy}
          style={style}
          styles={styles}
          onChange={(next) => {
            setSelected(next);
            setYear('');
            setJumpYear(undefined);
          }}
        />
        <form
          className="catalogue-jump"
          onSubmit={(event) => {
            event.preventDefault();
            if (/^[1-9][0-9]{3}$/.test(year)) setJumpYear(Number(year));
          }}
        >
          <label htmlFor="catalogue-jump-year">Jump to year</label>
          <input
            id="catalogue-jump-year"
            type="text"
            inputMode="numeric"
            maxLength={4}
            pattern="[1-9][0-9]{3}"
            required
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
            }}
          />
          <button type="submit" className="secondary-button" disabled={busy || year.length !== 4}>
            Go
          </button>
        </form>
      </header>
      {error && <p role="alert">{error}</p>}
      {(preferred !== null || !bridge.crateStyles || selected !== null) && (
        <CatalogueTimeline
          key={`${style}:${jumpYear ?? ''}`}
          jumpYear={jumpYear}
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
