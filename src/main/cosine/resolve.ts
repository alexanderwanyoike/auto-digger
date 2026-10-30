import { recommendationSchema } from '../../shared/cosine';
import type { CosineResult, ResolvedRecommendation } from '../../shared/cosine';
import { cosineFailure } from '../../shared/cosine-failure';
import { videoId } from '../../shared/youtube-video-id';
import { requestDiscogs } from '../discogs/request';
import { releaseMetadataSchema } from '../discogs/release-metadata';

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
export async function resolveRecommendation(
  input: unknown,
  request: typeof fetch,
): Promise<CosineResult<ResolvedRecommendation>> {
  const parsed = recommendationSchema.safeParse(input);
  if (!parsed.success)
    return cosineFailure('invalid-input', 'Choose a recommendation from the list.');
  const item = parsed.data;
  if (!item.releaseId)
    return cosineFailure('not-found', 'This recommendation has no linked Discogs release.');
  const result = await requestDiscogs(
    `/releases/${item.releaseId.toString()}`,
    null,
    releaseMetadataSchema,
    request,
  );
  if (!result.ok)
    return cosineFailure(
      result.error.code === 'rate-limited' ? 'rate-limited' : 'unavailable',
      'The linked Discogs release could not be loaded. Please retry.',
    );
  if (result.value.id !== item.releaseId)
    return cosineFailure(
      'invalid-response',
      'The Discogs release did not match the recommendation link.',
    );
  const release = result.value;
  const matches = release.tracks.flatMap((track, index) =>
    normalise(track.title) === normalise(item.title) ? [index] : [],
  );
  const trackIndex =
    matches.length === 1 &&
    release.artists.some((artist) => normalise(artist) === normalise(item.artist))
      ? (matches[0] ?? null)
      : null;
  const id = videoId(item.youtubeUrl ?? '');
  if (!id) return { ok: true, value: { release, videoIndex: null, trackIndex } };
  const videoIndex = release.videos.findIndex((video) => videoId(video.url) === id);
  const candidate = {
    title: `${item.artist} - ${item.title}`,
    url: `https://www.youtube.com/watch?v=${id}`,
    cosineTrackIndex: trackIndex,
  };
  const videos =
    videoIndex < 0
      ? [...release.videos, candidate]
      : release.videos.map((video, index) =>
          index === videoIndex ? { ...video, cosineTrackIndex: trackIndex } : video,
        );
  return {
    ok: true,
    value: {
      release: { ...release, videos },
      videoIndex: videoIndex < 0 ? videos.length - 1 : videoIndex,
      trackIndex,
    },
  };
}
