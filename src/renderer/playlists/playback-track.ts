import type { LocalTrack } from '../../shared/audio';
import type { DiscogsRelease } from '../../shared/discogs';
import type { PlaylistTrack } from '../../shared/playlists';
import { matchesTrackPosition } from '../../shared/track-position';

export function playbackPlaylistTrack(
  source: LocalTrack,
  release: DiscogsRelease | null | undefined,
): PlaylistTrack | null {
  if (release?.id !== source.releaseId || source.trackIndex === null) return null;
  const trackIndex = release.tracks.findIndex(
    (track, index) => track.title === source.title && matchesTrackPosition(source, release, index),
  );
  return trackIndex === -1 ? null : { release, trackIndex };
}
