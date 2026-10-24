import type { useDiscogs } from './useDiscogs';

export function SearchResults({ session }: { session: ReturnType<typeof useDiscogs> }) {
  const { matches, filters } = session;
  if (!matches || !filters) return null;
  return (
    <section className="search-results" aria-label="Matching EPs">
      <h2>{matches.items} matching releases</h2>
      {matches.items > 10000 && (
        <p>
          Discogs makes the first 10,000 matches available. Narrow the filters to explore further.
        </p>
      )}
      {!matches.releases.length && <p>No matching EPs. Try a broader label, year or style.</p>}
      <ul>
        {matches.releases.map((release) => (
          <li key={release.id}>
            <button
              type="button"
              className="search-result"
              disabled={session.busy}
              onClick={() => {
                session.loadRelease(release.id).catch(() => undefined);
              }}
            >
              <strong>{release.title}</strong>
              <span>
                {release.year || 'Year not listed'} ·{' '}
                {release.labels.join(', ') || 'Label not listed'}
              </span>
            </button>
          </li>
        ))}
      </ul>
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
