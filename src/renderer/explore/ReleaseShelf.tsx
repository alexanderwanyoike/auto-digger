import { RefreshCw } from 'lucide-react';
import { ReleaseMatchList } from '../discogs/ReleaseMatchList';
import type { useStarterShelf } from './use-starter-shelf';

export function ReleaseShelf({
  title,
  headingId,
  refresh,
  refreshBusy = false,
  shelf,
  disabled,
  open,
  preview,
  previewBusy,
}: {
  title: string;
  headingId: string;
  refresh?: () => void;
  refreshBusy?: boolean;
  shelf: ReturnType<typeof useStarterShelf>;
  disabled: boolean;
  preview?: ((id: number) => void) | undefined;
  previewBusy?: boolean | undefined;
  open: (id: number) => void;
}) {
  return (
    <section className="explore-shelf" aria-labelledby={headingId}>
      <header className="explore-shelf-header">
        <h2 id={headingId}>{title}</h2>
        {refresh && (
          <button
            className="secondary-button"
            type="button"
            onClick={refresh}
            disabled={disabled || shelf.busy || refreshBusy}
          >
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        )}
      </header>
      {shelf.busy && !shelf.releases.length && <p role="status">Loading releases…</p>}
      {shelf.error && !shelf.busy && <p role="alert">{shelf.error}</p>}
      {!shelf.busy && !shelf.error && !shelf.releases.length && <p>No unseen releases found.</p>}
      <ReleaseMatchList
        releases={shelf.releases}
        disabled={disabled}
        onOpen={open}
        onPreview={preview}
        previewBusy={previewBusy}
      />
    </section>
  );
}
