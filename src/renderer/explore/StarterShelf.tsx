import { RefreshCw } from 'lucide-react';
import { ReleaseMatchList } from '../discogs/ReleaseMatchList';
import type { useStarterShelf } from './use-starter-shelf';

export function StarterShelf({
  shelf,
  disabled,
  open,
}: {
  shelf: ReturnType<typeof useStarterShelf>;
  disabled: boolean;
  open: (id: number) => void;
}) {
  return (
    <section className="explore-shelf" aria-labelledby="explore-starter-heading">
      <header className="explore-shelf-header">
        <h2 id="explore-starter-heading">Discover records</h2>
        <button
          className="secondary-button"
          type="button"
          onClick={shelf.refresh}
          disabled={disabled || shelf.busy}
        >
          <RefreshCw size={14} aria-hidden="true" /> Refresh
        </button>
      </header>
      {shelf.busy && !shelf.releases.length && <p role="status">Loading releases…</p>}
      {shelf.error && !shelf.busy && <p role="alert">{shelf.error}</p>}
      {!shelf.busy && !shelf.error && !shelf.releases.length && <p>No unseen releases found.</p>}
      <ReleaseMatchList releases={shelf.releases} disabled={disabled} onOpen={open} />
    </section>
  );
}
