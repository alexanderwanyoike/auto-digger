import { useEffect, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import { CatalogueStylePicker } from './CatalogueStylePicker';
import { CatalogueTimeline } from './CatalogueTimeline';
import { catalogueStyles, starterStyle } from './catalogue-years';

export function CataloguePage({
  bridge,
  onBack,
  onOpen,
  onUnauthorized,
}: {
  bridge: DiscogsBridge;
  onBack: () => void;
  onOpen: (id: number) => void;
  onUnauthorized: () => void;
}) {
  const [preferred, setPreferred] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const load = bridge.crateStyles;
    if (!load) return undefined;
    load()
      .then((result) => {
        if (!active) return;
        if (result.ok) setPreferred(result.value);
        else {
          setError(result.error.message);
          setPreferred([]);
        }
      })
      .catch(() => {
        if (!active) return;
        setError('Saved styles could not be loaded.');
        setPreferred([]);
      });
    return () => {
      active = false;
    };
  }, [bridge]);
  const styles = catalogueStyles(preferred ?? []);
  const style = selected ?? styles.find((value) => preferred?.includes(value)) ?? starterStyle;
  return (
    <section className="catalogue-page" aria-labelledby="catalogue-heading">
      <header className="catalogue-header">
        <div>
          <button className="secondary-button" type="button" onClick={onBack}>
            Back to Explore
          </button>
          <h2 id="catalogue-heading">Catalogue</h2>
        </div>
        <CatalogueStylePicker style={style} styles={styles} onChange={setSelected} />
      </header>
      {error && <p role="alert">{error}</p>}
      {(preferred !== null || !bridge.crateStyles || selected !== null) && (
        <CatalogueTimeline
          key={style}
          style={style}
          search={bridge.search}
          onOpen={onOpen}
          onUnauthorized={onUnauthorized}
        />
      )}
    </section>
  );
}
