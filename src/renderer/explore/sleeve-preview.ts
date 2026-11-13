import type { DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import type { AudioBridge, AudioResult, DownloadInput, LocalTrack } from '../../shared/audio';
import { matchTrack } from '../../shared/match-track';
import { videoId } from '../../shared/youtube-video-id';
import { audioFailure } from '../../shared/audio-failure';
import { uniqueVideoIndexes } from '../audio/unique-video-indexes';

export async function sleevePreview(
  load: NonNullable<DiscogsBridge['previewRelease']>,
  probe: AudioBridge['probe'],
  preview: (input: DownloadInput) => Promise<AudioResult<LocalTrack>>,
  id: number,
  savedTracks: LocalTrack[],
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
  const clear = sources.filter(
    ({ trackIndex }) =>
      sources.filter((candidate) => candidate.trackIndex === trackIndex).length === 1,
  );
  const unavailable = audioFailure<LocalTrack>(
    'unavailable',
    'No clear preview source is available for this release.',
  );
  async function trySource(
    position: number,
    previousFailure: AudioResult<LocalTrack> | DiscogsResult<never>,
  ): Promise<AudioResult<LocalTrack> | DiscogsResult<never>> {
    const source = clear[position];
    const video = source && release.videos[source.videoIndex];
    if (!source || !video) return previousFailure;
    const sourceId = videoId(video.url);
    const saved = savedTracks.find(
      (track) => !track.missing && track.id === `${id.toString()}-${sourceId ?? ''}`,
    );
    if (saved && matchTrack(release, saved.sourceTitle) === source.trackIndex)
      return preview({ release, ...source });
    const checked = await probe(video.url);
    if (!checked.ok) return trySource(position + 1, checked);
    if (matchTrack(release, checked.value.title) !== source.trackIndex)
      return trySource(position + 1, previousFailure);
    return preview({ release, ...source });
  }
  return trySource(0, unavailable);
}
