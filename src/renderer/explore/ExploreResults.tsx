import { ReleaseMatchList } from '../discogs/ReleaseMatchList';
import type { ExploreView } from './use-explore';

export function ExploreResults({
  view,
  disabled,
  open,
  paginate,
}: {
  view: ExploreView;
  disabled: boolean;
  open: (id: number) => void;
  paginate: (page: number) => void;
}) {
  if (view.kind === 'years')
    return (
      <div className="explore-years">
        {view.years.map(({ year, releases }) => (
          <section className="search-results" key={year} aria-labelledby={`explore-year-${year}`}>
            <h3 id={`explore-year-${year}`}>{year}</h3>
            {!releases.length && <p>No releases found for this year.</p>}
            <ReleaseMatchList releases={releases} disabled={disabled} onOpen={open} />
          </section>
        ))}
      </div>
    );
  if (view.kind === 'discover')
    return (
      <section className="search-results" aria-label="Unseen releases">
        <h3>Unseen releases</h3>
        {!view.releases.length && (
          <p>No unseen releases in this selection. Try another roll or browse the catalogue.</p>
        )}
        <ReleaseMatchList releases={view.releases} disabled={disabled} onOpen={open} />
      </section>
    );
  const { matches } = view;
  return (
    <section className="search-results" aria-label="Catalogue results">
      <h3>{matches.items} matching releases</h3>
      {!matches.releases.length && <p>No releases found.</p>}
      <ReleaseMatchList releases={matches.releases} disabled={disabled} onOpen={open} />
      {matches.pages > 1 && (
        <nav aria-label="Explore pages">
          <button
            type="button"
            onClick={() => {
              paginate(matches.page - 1);
            }}
            disabled={disabled || matches.page <= 1}
          >
            Previous page
          </button>
          <span>
            Page {matches.page} of {matches.pages}
          </span>
          <button
            type="button"
            onClick={() => {
              paginate(matches.page + 1);
            }}
            disabled={disabled || matches.page >= matches.pages}
          >
            Next page
          </button>
        </nav>
      )}
    </section>
  );
}
