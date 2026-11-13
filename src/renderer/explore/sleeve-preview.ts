import type { DiscogsBridge } from '../../shared/discogs';
import type { AudioBridge, AudioResult, DownloadInput, LocalTrack } from '../../shared/audio';
import { matchTrack } from '../../shared/match-track';
import { videoId } from '../../shared/youtube-video-id';
import { audioFailure } from '../../shared/audio-failure';
import { uniqueVideoIndexes } from '../audio/unique-video-indexes';

export async function sleevePreview(
  load: NonNullable<DiscogsBridge['previewRelease']>,
  probe: AudioBridge['probe'],
  preview: (input: DownloadInput, sleeveReleaseId: number) => Promise<AudioResult<LocalTrack>>,
  id: number,
) {
  const result = await load(id);
  if (!result.ok) return result;
  const release = result.value;
  const sources = uniqueVideoIndexes(release.videos).flatMap((videoIndex) => {
    const video = release.videos[videoIndex];
    if (!video) return [];
    const trackIndex = matchTrack(release, video.title);
    return trackIndex !== null && videoId(video.url) ? [{ videoIndex, trackIndex }] : [];
  });
  const source = sources.find(
    ({ trackIndex }) =>
      sources.filter((candidate) => candidate.trackIndex === trackIndex).length === 1,
  );
  if (!source)
    return audioFailure('unavailable', 'No clear preview source is available for this release.');
  const video = release.videos[source.videoIndex];
  if (!video)
    return audioFailure('unavailable', 'No clear preview source is available for this release.');
  const checked = await probe(video.url);
  if (!checked.ok) return checked;
  if (matchTrack(release, checked.value.title) !== source.trackIndex)
    return audioFailure('unavailable', 'The upload title does not match the release track.');
  return preview({ release, ...source }, id);
}
