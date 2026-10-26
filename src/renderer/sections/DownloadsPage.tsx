import { useState } from 'react';
import { FolderOpen, Search } from 'lucide-react';
import type { useAudioLibrary } from '../audio/useAudioLibrary';
import { libraryRows } from '../library/rows';
import { TrackRow } from '../library/TrackRow';

export function DownloadsPage({ audio }: { audio: ReturnType<typeof useAudioLibrary> }) {
  const [query, setQuery] = useState('');
  const rows = libraryRows(audio.tracks, audio.queue.jobs, query);
  return (
    <section className="section-page downloads-page" aria-label="Downloaded library">
      <div className="library-toolbar">
        <label className="library-search" htmlFor="search-downloads">
          <span className="sr-only">Search downloads</span>
          <Search size={15} aria-hidden="true" />
          <input
            id="search-downloads"
            type="search"
            value={query}
            placeholder="Search tracks, artists or releases"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>
        <span className="library-count">
          {rows.length} {rows.length === 1 ? 'track' : 'tracks'}
        </span>
        <button
          type="button"
          className="icon-button library-folder"
          aria-label="Open downloads folder"
          title="Open downloads folder"
          disabled={!audio.available}
          onClick={() => {
            audio.reveal().catch(() => undefined);
          }}
        >
          <FolderOpen size={17} aria-hidden="true" />
        </button>
      </div>
      {audio.queue.error && (
        <p role="alert" className="library-error">
          {audio.queue.error}
        </p>
      )}
      <div className="library-scroll">
        <table className="library-table downloaded-list" aria-label="Tracks">
          <colgroup>
            <col className="column-track" />
            <col className="column-artist" />
            <col />
            <col className="column-actions" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Track</th>
              <th scope="col">Artist</th>
              <th scope="col">Release</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <TrackRow key={row.id} row={row} audio={audio} />
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="library-empty">
                  {query.trim()
                    ? 'No tracks match this search.'
                    : 'No downloads yet. Download a track from the digging desk.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
