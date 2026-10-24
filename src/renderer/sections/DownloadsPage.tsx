import { useState } from 'react';
import { FolderOpen, Play } from 'lucide-react';
import type { useAudioLibrary } from '../audio/useAudioLibrary';
import { RecordArtwork } from '../components/RecordArtwork';

export function DownloadsPage({ audio }: { audio: ReturnType<typeof useAudioLibrary> }) {
  const [query, setQuery] = useState('');
  const tracks = audio.tracks.filter((track) =>
    `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="section-page downloads-page" aria-label="Downloaded library">
      <div className="section-intro">
        <span className="eyebrow">ON THIS DEVICE / {audio.tracks.length} TRACKS</span>
        <p>The records you committed to. Ready to play offline.</p>
      </div>
      <div className="library-toolbar">
        <label htmlFor="search-downloads">
          Search downloads
          <input
            id="search-downloads"
            type="search"
            value={query}
            placeholder="Artist, track or release"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>
        <button
          type="button"
          className="secondary-button"
          disabled={!audio.available}
          onClick={() => {
            audio.reveal().catch(() => undefined);
          }}
        >
          <FolderOpen size={14} aria-hidden="true" /> Open downloads folder
        </button>
      </div>
      {!tracks.length && (
        <p className="section-empty">
          {query
            ? 'No downloaded tracks match this search.'
            : 'Nothing downloaded yet. Preview a record on the digging desk, then save the tracks you want.'}
        </p>
      )}
      <ul className="downloaded-list">
        {tracks.map((track) => (
          <li key={track.id}>
            <RecordArtwork url={track.artworkUrl} title={track.album} decorative />
            <div>
              <strong>{track.title}</strong>
              <span>
                {track.artist} · {track.album}
              </span>
              {track.missing && <small>File missing or unavailable</small>}
              {track.warning && <small>{track.warning}</small>}
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label={`Play ${track.title}`}
              disabled={track.missing === true}
              onClick={() => {
                audio.play(track);
              }}
            >
              <Play size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`Show ${track.title} in folder`}
              onClick={() => {
                audio.reveal(track.id).catch(() => undefined);
              }}
            >
              <FolderOpen size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
