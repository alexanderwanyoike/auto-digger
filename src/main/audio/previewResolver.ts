import { z } from 'zod';
import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';
import { videoId } from '../../shared/youtubeVideoId';
import type { Execute } from './downloader';

export interface ResolvedPreview {
  videoId: string;
  title: string;
  url: string;
  headers: Record<string, string>;
}
const streamSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  url: z.string().max(20000),
  is_live: z.boolean().optional(),
  http_headers: z.record(z.string(), z.string().max(8192)).optional(),
});

export function isPreviewUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.hostname.endsWith('.googlevideo.com')
    );
  } catch {
    return false;
  }
}

export function createPreviewResolver(execute: Execute) {
  return async (url: string, signal?: AbortSignal): Promise<AudioResult<ResolvedPreview>> => {
    const id = videoId(url);
    if (!id) return audioFailure('invalid-input', 'Choose a supported YouTube source to preview.');
    const result = await execute(
      [
        '--js-runtimes',
        'node',
        '--ignore-config',
        '--no-plugin-dirs',
        '--no-playlist',
        '--no-warnings',
        '--socket-timeout',
        '20',
        '--retries',
        '2',
        '--format',
        'bestaudio[ext=webm]/bestaudio',
        '--dump-single-json',
        '--skip-download',
        '--',
        `https://www.youtube.com/watch?v=${id}`,
      ],
      45_000,
      signal,
    );
    if (!result.ok) return result;
    try {
      const data: unknown = JSON.parse(result.value);
      const parsed = streamSchema.safeParse(data);
      if (
        parsed.success &&
        parsed.data.id === id &&
        !parsed.data.is_live &&
        isPreviewUrl(parsed.data.url)
      ) {
        const headers = Object.fromEntries(
          Object.entries(parsed.data.http_headers ?? {}).filter(([name]) =>
            ['user-agent', 'referer', 'origin'].includes(name.toLowerCase()),
          ),
        );
        return {
          ok: true,
          value: { videoId: id, title: parsed.data.title, url: parsed.data.url, headers },
        };
      }
    } catch {
      /* Source details stay inside the main process. */
    }
    return audioFailure(
      'unavailable',
      'This source cannot be previewed. Try another video or download it to listen locally.',
    );
  };
}
