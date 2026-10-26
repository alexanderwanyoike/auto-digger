import { useState } from 'react';
import { FolderOpen, Search } from 'lucide-react';
import type { useAudioLibrary } from '../audio/use-audio-library';
import { libraryRows } from '../library/rows';
import { TrackRow } from '../library/TrackRow';
import { sourceLabels } from '../library/source';
import type { DownloadSourceFilter } from '../library/source';

export function DownloadsPage({ audio }: { audio: ReturnType<typeof useAudioLibrary> }) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<DownloadSourceFilter>('all');
  const rows = libraryRows(audio.tracks, audio.queue.jobs, query, source);
  let empty = 'No downloads yet. Download a track from the digging desk.';
  if (source !== 'all') empty = `No ${sourceLabels[source]} downloads yet.`;
  if (query.trim()) empty = 'No tracks match this search.';
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
        <label className="library-source-filter" htmlFor="download-source-filter">
          <span className="sr-only">Filter downloads by source</span>
          <select
            id="download-source-filter"
            value={source}
            onChange={(event) => {
              const { value } = event.target;
              if (value === 'all' || value === 'youtube' || value === 'soulseek') setSource(value);
            }}
          >
            <option value="all">All sources</option>
            <option value="youtube">YouTube</option>
            <option value="soulseek">Soulseek</option>
          </select>
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
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
