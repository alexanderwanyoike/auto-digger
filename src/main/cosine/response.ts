import { z } from 'zod';
import { videoId } from '../../shared/youtube-video-id';
import type { Recommendation } from '../../shared/cosine';

const track = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  artist: z.string().min(1).max(500),
  track: z.string().min(1).max(500),
  external_link: z.string().nullish(),
  video_uri: z.string().nullish(),
});
function releaseId(value: string | null | undefined): number | null {
  try {
    const url = new URL(value ?? '');
    if (
      url.protocol !== 'https:' ||
      url.port ||
      url.username ||
      url.password ||
      !['discogs.com', 'www.discogs.com'].includes(url.hostname)
    )
      return null;
    const match = /^\/release\/([1-9][0-9]*)(?:-[^/]*)?\/?$/.exec(url.pathname);
    const id = Number(match?.[1]);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
function mapTrack(value: z.infer<typeof track>): Recommendation {
  const id = videoId(value.video_uri ?? '');
  return {
    id: value.id,
    artist: value.artist,
    title: value.track,
    releaseId: releaseId(value.external_link),
    youtubeUrl: id ? `https://www.youtube.com/watch?v=${id}` : null,
  };
}
export const lookupSchema = z
  .object({ success: z.literal(true), data: z.array(track) })
  .transform((value) => value.data.map(mapTrack));
export const similarSchema = z
  .object({ success: z.literal(true), data: z.object({ similar_tracks: z.array(track) }) })
  .transform((value) => value.data.similar_tracks.map(mapTrack));
export function distinctTracks(items: Recommendation[], seed?: Recommendation): Recommendation[] {
  const ids = new Set<string>(seed ? [seed.id] : []);
  const videos = new Set<string>(seed?.youtubeUrl ? [seed.youtubeUrl] : []);
  return items
    .filter((item) => {
      if (ids.has(item.id) || (item.youtubeUrl && videos.has(item.youtubeUrl))) return false;
      ids.add(item.id);
      if (item.youtubeUrl) videos.add(item.youtubeUrl);
      return true;
    })
    .slice(0, 10);
}
