import { useContext, useState } from 'react';
import { Heart, ListPlus } from 'lucide-react';
import type { PlaylistTrack } from '../../shared/playlists';
import { trackPosition } from '../../shared/track-position';
import { likesId } from '../../shared/playlists';
import { PlaylistsContext } from './playlists-context';

export function PlaylistTrackActions({ track }: { track: PlaylistTrack }) {
  const playlists = useContext(PlaylistsContext);
  const [open, setOpen] = useState(false);
  if (!playlists?.available) return null;
  const position = trackPosition(track.release, track.trackIndex);
  if (!position) return null;
  const { title } = position;
  const entryIn = (playlistId: string) =>
    playlists.lists
      .find(({ id }) => id === playlistId)
      ?.entries.find(({ track: entry }) => {
        if (entry.release.id !== track.release.id) return false;
        const saved = trackPosition(entry.release, entry.trackIndex);
        return (
          saved?.position === position.position &&
          saved.title === title &&
          saved.occurrence === position.occurrence
        );
      });
  const liked = entryIn(likesId);
  const available = playlists.lists.filter(({ id }) => id !== likesId);
  return (
    <span className="playlist-track-actions">
      <button
        type="button"
        className="icon-button"
        aria-label={`Like ${title}`}
        title={liked ? 'Remove from Likes' : 'Add to Likes'}
        aria-pressed={Boolean(liked)}
        disabled={!playlists.enabled}
        onClick={() => {
          const change = liked
            ? playlists.remove(likesId, liked.id)
            : playlists.add(likesId, track);
          change.catch(() => undefined);
        }}
      >
        <Heart size={15} aria-hidden="true" />
      </button>
      {available.length > 0 && (
        <button
          type="button"
          className="icon-button"
          aria-label={`Add ${title} to playlist`}
          title="Add to playlist"
          aria-expanded={open}
          disabled={!playlists.enabled}
          onClick={() => {
            setOpen((previous) => !previous);
          }}
        >
          <ListPlus size={16} aria-hidden="true" />
        </button>
      )}
      {open && (
        <span className="playlist-track-choices">
          {available.map((playlist) => (
            <button
              type="button"
              className="secondary-button"
              key={playlist.id}
              aria-label={`Add to ${playlist.name}`}
              disabled={!playlists.enabled || Boolean(entryIn(playlist.id))}
              onClick={() => {
                setOpen(false);
                playlists.add(playlist.id, track).catch(() => undefined);
              }}
            >
              {playlist.name}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
