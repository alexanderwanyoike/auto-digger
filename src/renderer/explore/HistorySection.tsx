import { useEffect, useState } from 'react';
import type { DiscogsBridge } from '../../shared/discogs';
import type { HistoryEntry } from '../../shared/discovery-history';
import { RecordArtwork } from '../components/RecordArtwork';

export function HistorySection({
  load,
  revision,
  canOpen,
  onOpen,
}: {
  load: NonNullable<DiscogsBridge['discoveryHistory']>;
  revision: number;
  canOpen: boolean;
  onOpen: (id: number) => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setEntries(result.value);
          setError(null);
        } else setError(result.error.message);
      })
      .catch(() => {
        if (active) setError('History could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [attempt, load, revision]);

  return (
    <section className="explore-history" aria-labelledby="explore-history-heading">
      <h2 id="explore-history-heading">History</h2>
      {!entries && !error && <p role="status">Loading history…</p>}
      {entries?.length === 0 && !error && <p>No releases opened or played yet.</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setError(null);
              setAttempt((previous) => previous + 1);
            }}
          >
            Retry
          </button>
        </>
      )}
      {entries && entries.length > 0 && (
        <ul>
          {entries.map(({ id, title, artist, artworkUrl, played }) => (
            <li key={id}>
              <button
                type="button"
                disabled={!canOpen}
                onClick={() => {
                  onOpen(id);
                }}
              >
                <RecordArtwork url={artworkUrl} title={title} decorative />
                <span className="history-release">
                  <strong>{title}</strong>
                  {artist && <span>{artist}</span>}
                </span>
                <span>{played ? 'Played' : 'Opened'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
