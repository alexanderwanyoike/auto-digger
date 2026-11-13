import { ReleaseMatchList } from './ReleaseMatchList';
import type { useDiscogs } from './use-discogs';

export function SearchResults({ session }: { session: ReturnType<typeof useDiscogs> }) {
  const { matches, filters } = session;
  if (!matches || !filters) return null;
  return (
    <section className="search-results" aria-label="Matching releases">
      <h2>{matches.items} matching releases</h2>
      {matches.items > 10000 && (
        <p>
          Discogs makes the first 10,000 matches available. Narrow the filters to explore further.
        </p>
      )}
      {!matches.releases.length && <p>No matching releases. Try a broader label, year or style.</p>}
      <ReleaseMatchList
        releases={matches.releases}
        disabled={session.busy}
        onOpen={(id) => {
          session.loadRelease(id).catch(() => undefined);
        }}
      />
      {matches.pages > 1 && (
        <nav aria-label="Search pages">
          <button
            type="button"
            disabled={session.busy || matches.page <= 1}
            onClick={() => {
              session.search(filters, matches.page - 1).catch(() => undefined);
            }}
          >
            Previous page
          </button>
          <span>
            Page {matches.page} of {matches.pages}
          </span>
          <button
            type="button"
            disabled={session.busy || matches.page >= matches.pages}
            onClick={() => {
              session.search(filters, matches.page + 1).catch(() => undefined);
            }}
          >
            Next page
          </button>
        </nav>
      )}
    </section>
  );
}
