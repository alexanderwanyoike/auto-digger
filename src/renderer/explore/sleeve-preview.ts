import type { DiscogsBridge } from '../../shared/discogs';
import type { AudioResult, DownloadInput, LocalTrack } from '../../shared/audio';
import { matchTrack } from '../../shared/match-track';
import { videoId } from '../../shared/youtube-video-id';
import { audioFailure } from '../../shared/audio-failure';

export async function sleevePreview(
  load: NonNullable<DiscogsBridge['previewRelease']>,
  preview: (input: DownloadInput, sleeveReleaseId: number) => Promise<AudioResult<LocalTrack>>,
  id: number,
) {
  const result = await load(id);
  if (!result.ok) return result;
  const release = result.value;
  const sources = release.videos.flatMap((video, videoIndex) => {
    const trackIndex = matchTrack(release, video.title);
    return trackIndex !== null && videoId(video.url) ? [{ videoIndex, trackIndex }] : [];
  });
  const source = sources.find(
    ({ trackIndex }) =>
      sources.filter((candidate) => candidate.trackIndex === trackIndex).length === 1,
  );
  if (!source)
    return audioFailure('unavailable', 'No clear preview source is available for this release.');
  return preview({ release, ...source }, id);
}
