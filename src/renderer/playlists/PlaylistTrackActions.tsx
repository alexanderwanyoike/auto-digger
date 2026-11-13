import { useEffect, useRef, useState } from 'react';
import { Heart, ListPlus } from 'lucide-react';
import type { DownloadInput, LocalTrack } from '../../shared/audio';
import type { DiscogsRelease, DiscogsResult } from '../../shared/discogs';
import { likesId } from '../../shared/playlists';
import { playbackPlaylistTrack } from './playback-track';
import type { usePlaylists } from './use-playlists';

export function PlaylistTrackActions({
  source,
  preview,
  release,
  loadRelease,
  playlists,
  openPlaylists,
}: {
  source: LocalTrack;
  preview: DownloadInput | undefined;
  release: DiscogsRelease | null | undefined;
  loadRelease: ((id: number) => Promise<DiscogsResult<DiscogsRelease>>) | undefined;
  playlists: ReturnType<typeof usePlaylists>;
  openPlaylists: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !root.current?.contains(document.activeElement)) return;
      event.stopPropagation();
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const entryIn = (id: string) =>
    playlists.lists
      .find((list) => list.id === id)
      ?.entries.find(
        ({ track }) =>
          playbackPlaylistTrack(source, track.release)?.trackIndex === track.trackIndex,
      );
  const liked = entryIn(likesId);
  const available = playlists.lists.filter(({ id }) => id !== likesId);

  async function add(id: string) {
    setBusy(true);
    setError(null);
    try {
      const known =
        playbackPlaylistTrack(source, source.release) ??
        playbackPlaylistTrack(source, preview?.release) ??
        playbackPlaylistTrack(source, release) ??
        playlists.lists
          .flatMap((list) => list.entries.map(({ track }) => track))
          .find(
            (track) =>
              playbackPlaylistTrack(source, track.release)?.trackIndex === track.trackIndex,
          );
      const loaded = known ? null : await loadRelease?.(source.releaseId);
      const track = known ?? (loaded?.ok ? playbackPlaylistTrack(source, loaded.value) : null);
      if (!track) {
        if (loaded && !loaded.ok) setError(loaded.error.message);
        else if (!loadRelease) setError('Connect Discogs to load the release for this download.');
        else setError('The playing track could not be matched to its Discogs release.');
        return;
      }
      const matchedPreview = preview && playbackPlaylistTrack(source, preview.release);
      await playlists.add(
        id,
        track,
        matchedPreview ? { ...preview, trackIndex: matchedPreview.trackIndex } : undefined,
      );
    } catch {
      setError('The playing track could not be saved. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="playlist-track-actions" ref={root}>
      <button
        type="button"
        className="icon-button"
        aria-label={`Like ${source.title}`}
        title={liked ? 'Remove from Likes' : 'Add to Likes'}
        aria-pressed={Boolean(liked)}
        disabled={!playlists.enabled || busy}
        onClick={() => {
          const change = liked ? playlists.remove(likesId, liked.id) : add(likesId);
          change.catch(() => undefined);
        }}
      >
        <Heart size={16} aria-hidden="true" />
      </button>
      <button
        ref={toggle}
        type="button"
        className="icon-button"
        aria-label={`Add ${source.title} to playlist`}
        title="Add to playlist"
        aria-expanded={open}
        disabled={!playlists.enabled || busy}
        onClick={() => {
          setError(null);
          setOpen((previous) => !previous);
        }}
      >
        <ListPlus size={17} aria-hidden="true" />
      </button>
      {open && (
        <div className="playlist-track-choices" role="group" aria-label="Add to playlist">
          {available.map((playlist) => (
            <button
              type="button"
              className="secondary-button"
              key={playlist.id}
              aria-label={`Add to ${playlist.name}`}
              disabled={!playlists.enabled || Boolean(entryIn(playlist.id))}
              onClick={() => {
                setOpen(false);
                toggle.current?.focus();
                add(playlist.id).catch(() => undefined);
              }}
            >
              {playlist.name}
            </button>
          ))}
          {!available.length && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setOpen(false);
                openPlaylists();
              }}
            >
              Create a playlist
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="playlist-track-choices">
          {error}
        </p>
      )}
    </div>
  );
}
