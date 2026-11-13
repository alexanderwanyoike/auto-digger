import { ReleaseMatchList } from '../discogs/ReleaseMatchList';
import type { useStarterShelf } from './use-starter-shelf';

export function ReleaseShelf({
  title,
  headingId,
  shelf,
  disabled,
  open,
  preview,
  previewBusy,
  onShowMore,
}: {
  title: string;
  headingId: string;
  shelf: ReturnType<typeof useStarterShelf>;
  disabled: boolean;
  preview?: ((id: number) => void) | undefined;
  previewBusy?: boolean | undefined;
  open: (id: number) => void;
  onShowMore: (() => void) | undefined;
}) {
  return (
    <section className="explore-shelf" aria-labelledby={headingId}>
      <header className="explore-shelf-header">
        <h2 id={headingId}>{title}</h2>
        {onShowMore && (
          <button
            type="button"
            id={`${headingId}-more`}
            className="explore-show-more"
            onClick={onShowMore}
            disabled={disabled}
          >
            Show more
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
