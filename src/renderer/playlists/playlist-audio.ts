import type { LocalTrack, YouTubeDownloadInput } from '../../shared/audio';
import { downloadSourceId } from '../../shared/download-source-id';
import type { PlaylistTrack } from '../../shared/playlists';
import type { DownloadJob } from '../../shared/download-jobs';
import { sourceAssignment } from '../audio/source-assignment';
import { uniqueVideoIndexes } from '../audio/unique-video-indexes';

export function localPlaylistTrack({ release, trackIndex }: PlaylistTrack, tracks: LocalTrack[]) {
  return tracks.find(
    (track) =>
      !track.missing &&
      track.releaseId === release.id &&
      track.trackIndex === trackIndex &&
      track.title === release.tracks[trackIndex]?.title,
  );
}

export function playlistSource({
  release,
  trackIndex,
}: PlaylistTrack): YouTubeDownloadInput | null {
  const matches = uniqueVideoIndexes(release.videos).filter(
    (index) =>
      sourceAssignment(release, index, undefined, undefined, undefined).selected === trackIndex,
  );
  const [videoIndex] = matches;
  return matches.length === 1 && videoIndex !== undefined
    ? { release, videoIndex, trackIndex }
    : null;
}

export function playlistJob(track: PlaylistTrack, jobs: DownloadJob[]) {
  const source = playlistSource(track);
  if (!source) return undefined;
  const id = downloadSourceId(source);
  return [...jobs].reverse().find((job) => job.sourceId === id);
}
