import { z } from 'zod';
import type { AudioResult, AudioSource } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';
import { videoId } from '../../shared/youtubeVideoId';

export type Execute = (
  args: string[],
  timeout: number,
  signal?: AbortSignal,
) => Promise<AudioResult<string>>;
const common = [
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
];
const metadataSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  is_live: z.boolean().optional(),
});

export function createDownloader(execute: Execute) {
  return {
    async probe(url: string): Promise<AudioResult<AudioSource>> {
      const id = videoId(url);
      if (!id)
        return audioFailure('invalid-input', 'This record does not have a supported YouTube link.');
      const result = await execute(
        [
          ...common,
          '--dump-single-json',
          '--skip-download',
          '--',
          `https://www.youtube.com/watch?v=${id}`,
        ],
        45_000,
      );
      if (!result.ok) return result;
      try {
        const data: unknown = JSON.parse(result.value);
        const parsed = metadataSchema.safeParse(data);
        if (parsed.success && parsed.data.id === id && !parsed.data.is_live) {
          return { ok: true, value: { videoId: id, title: parsed.data.title } };
        }
      } catch {
        /* A successful process can still return an unavailable source. */
      }
      return audioFailure(
        'unavailable',
        'This YouTube source cannot be downloaded. Try another video for this record.',
      );
    },
    async download(id: string, file: string): Promise<AudioResult<undefined>> {
      if (!/^[\w-]{11}$/.test(id) || !file.endsWith('.mp3'))
        return audioFailure('invalid-input', 'This download could not be prepared.');
      const result = await execute(
        [
          ...common,
          '--no-progress',
          '--no-overwrites',
          '--format',
          'bestaudio/best',
          '--extract-audio',
          '--audio-format',
          'mp3',
          '--audio-quality',
          '0',
          '--output',
          `${file.slice(0, -4)}.%(ext)s`,
          '--',
          `https://www.youtube.com/watch?v=${id}`,
        ],
        600_000,
      );
      return result.ok ? { ok: true, value: undefined } : result;
    },
  };
}
