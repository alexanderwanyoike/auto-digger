import { videoId } from '../../shared/youtube-video-id';
import type { DiscogsRelease } from '../../shared/discogs';

export function uniqueVideoIndexes(videos: DiscogsRelease['videos']): number[] {
  const seen = new Set<string>();
  return videos.flatMap((video, index) => {
    const key = videoId(video.url) ?? video.url;
    if (seen.has(key)) return [];
    seen.add(key);
    return [index];
  });
}
