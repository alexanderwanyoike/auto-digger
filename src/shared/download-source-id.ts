import type { DownloadInput } from './audio';
import { videoId } from './youtube-video-id';

export function downloadSourceId(input: DownloadInput): string | null {
  const source =
    'provider' in input
      ? `slsk-${input.candidateId}`
      : videoId(input.release.videos[input.videoIndex]?.url ?? '');
  return source ? `${input.release.id.toString()}-${source}` : null;
}
