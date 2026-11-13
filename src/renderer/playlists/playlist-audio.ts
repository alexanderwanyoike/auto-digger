import type { AudioBridge, AudioError, LocalTrack, YouTubeDownloadInput } from '../../shared/audio';
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

export async function findPlaylistSource(
  { release, trackIndex }: PlaylistTrack,
  probe: AudioBridge['probe'],
  savedTracks: LocalTrack[],
): Promise<{ source: YouTubeDownloadInput | null; error?: AudioError }> {
  let source: YouTubeDownloadInput | null = null;
  let error: AudioError | undefined;
  const candidates = uniqueVideoIndexes(release.videos);
  const check = async (
    index: number,
  ): Promise<{ source: YouTubeDownloadInput | null; error?: AudioError }> => {
    const videoIndex = candidates[index];
    const video = videoIndex === undefined ? undefined : release.videos[videoIndex];
    if (videoIndex === undefined || !video) return { source, ...(error ? { error } : {}) };
    const input = { release, videoIndex, trackIndex };
    const id = downloadSourceId(input);
    if (!id || savedTracks.some((track) => track.id === id && !track.missing))
      return check(index + 1);
    const checked = await probe(video.url);
    if (!checked.ok) error ??= checked.error;
    else if (
      sourceAssignment(release, videoIndex, checked, undefined, undefined).selected === trackIndex
    ) {
      if (source) return { source: null };
      source = input;
    }
    return check(index + 1);
  };
  return check(0);
}

export function playlistJob(track: PlaylistTrack, jobs: DownloadJob[]) {
  const ids = new Set(
    uniqueVideoIndexes(track.release.videos).map((videoIndex) =>
      downloadSourceId({ release: track.release, videoIndex }),
    ),
  );
  const title = track.release.tracks[track.trackIndex]?.title;
  return [...jobs].reverse().find((job) => ids.has(job.sourceId ?? null) && job.title === title);
}
