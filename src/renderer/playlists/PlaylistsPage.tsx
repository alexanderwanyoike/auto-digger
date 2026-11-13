import { useState } from 'react';
import { Heart, ListMusic, Play } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';
import { likesId } from '../../shared/playlists';
import type { useAudioLibrary } from '../audio/use-audio-library';
import type { usePlaylists } from './use-playlists';
import { localPlaylistTrack } from './playlist-audio';
import { PlaylistEntryRow } from './PlaylistEntryRow';

export function PlaylistsPage({
  playlists,
  audio,
  onOpen,
}: {
  playlists: ReturnType<typeof usePlaylists>;
  audio: ReturnType<typeof useAudioLibrary>;
  onOpen: (release: DiscogsRelease) => void;
}) {
  const [active, setActive] = useState(likesId);
  const [name, setName] = useState('');
  const selected = playlists.lists.find((list) => list.id === active);
  const playable = (selected?.entries ?? []).flatMap(({ track }) => {
    const saved = localPlaylistTrack(track, audio.tracks);
    return saved ? [saved] : [];
  });
  return (
    <div className="playlist-page">
      <aside className="playlist-browser" aria-label="Your playlists">
        <nav aria-label="Select playlist">
          {playlists.lists.map(({ id, name: label }) => {
            const Icon = id === likesId ? Heart : ListMusic;
            return (
              <button
                type="button"
                key={id}
                aria-current={id === active ? 'page' : undefined}
                onClick={() => {
                  setActive(id);
                }}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            playlists
              .create(name)
              .then((result) => {
                if (!result.ok) return;
                setActive(result.value.find((list) => list.name === name.trim())?.id ?? likesId);
                setName('');
              })
              .catch(() => undefined);
          }}
        >
          <label htmlFor="playlist-name">
            New playlist name
            <input
              id="playlist-name"
              value={name}
              maxLength={80}
              disabled={!playlists.enabled}
              onChange={(event) => {
                setName(event.target.value);
              }}
              required
            />
          </label>
          <button
            type="submit"
            className="secondary-button"
            disabled={!name.trim() || !playlists.enabled}
          >
            Create playlist
          </button>
        </form>
      </aside>
      {selected && (
        <section className="playlist-content" aria-labelledby="selected-playlist">
          <header className="playlist-content-header">
            <h2 id="selected-playlist">{selected.name}</h2>
            <button
              type="button"
              className="secondary-button"
              disabled={!playable.length}
              onClick={() => {
                audio.playSequence(playable);
              }}
            >
              <Play size={13} aria-hidden="true" /> Play playlist
            </button>
          </header>
          {!selected.entries.length && <p>No tracks in this playlist.</p>}
          <ul>
            {selected.entries.map((entry) => (
              <PlaylistEntryRow
                key={entry.id}
                entry={entry}
                playlist={selected.name}
                audio={audio}
                enabled={playlists.enabled}
                onOpen={onOpen}
                onRemove={(id) => {
                  playlists.remove(selected.id, id).catch(() => undefined);
                }}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
