import type { SearchPage } from '../../shared/search';
import { ReleaseMatchList } from '../discogs/ReleaseMatchList';

export function CatalogueYearShelf({
  year,
  releases,
  disabled,
  onOpen,
  onPreview,
  previewBusy,
  onShowMore,
}: {
  year: number;
  releases: SearchPage['releases'];
  disabled: boolean;
  onOpen: (id: number) => void;
  onPreview: ((id: number) => void) | undefined;
  previewBusy: boolean;
  onShowMore: () => void;
}) {
  return (
    <section
      className="explore-shelf catalogue-year"
      aria-label={year.toString()}
      data-release-year={year}
    >
      <header className="explore-shelf-header">
        <h3>{year}</h3>
        <button
          type="button"
          id={`explore-year-more-${year.toString()}`}
          className="explore-show-more"
          disabled={disabled}
          onClick={onShowMore}
        >
          Show more
        </button>
      </header>
      <ReleaseMatchList
        releases={releases}
        disabled={disabled}
        onOpen={onOpen}
        onPreview={onPreview}
        previewBusy={previewBusy}
      />
    </section>
  );
}
