import { z } from 'zod';
import type { AudioResult, AudioSource } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';
import { videoId } from '../../shared/youtubeVideoId';
import type { DownloadOptions } from './downloadOptions';
import { parseDownloadProgress } from './progress';
import { ytDlpArguments } from './ytDlpArguments';

export type Execute = (
  args: string[],
  timeout: number,
  signal?: AbortSignal,
  onLine?: (line: string) => void,
) => Promise<AudioResult<string>>;
const metadataSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  is_live: z.boolean().optional(),
});

export function createDownloader(execute: Execute) {
  return {
    async probe(url: string, signal?: AbortSignal): Promise<AudioResult<AudioSource>> {
      const id = videoId(url);
      if (!id)
        return audioFailure('invalid-input', 'This record does not have a supported YouTube link.');
      const result = await execute(
        [
          ...ytDlpArguments,
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
    async download(
      id: string,
      file: string,
      options: DownloadOptions = {},
    ): Promise<AudioResult<undefined>> {
      if (!/^[\w-]{11}$/.test(id) || !file.endsWith('.mp3'))
        return audioFailure('invalid-input', 'This download could not be prepared.');
      const result = await execute(
        [
          ...ytDlpArguments,
          '--newline',
          '--progress',
          '--progress-delta',
          '0.5',
          '--progress-template',
          'download:AD_PROGRESS:{"downloaded_bytes":%(progress.downloaded_bytes)j,"total_bytes":%(progress.total_bytes)j,"total_bytes_estimate":%(progress.total_bytes_estimate)j,"speed":%(progress.speed)j,"eta":%(progress.eta)j}',
          '--progress-template',
          'postprocess:AD_POSTPROCESS:%(progress.status)j',
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
        options.signal,
        (line) => {
          const progress = parseDownloadProgress(line);
          if (progress) options.onProgress?.(progress);
        },
      );
      return result.ok ? { ok: true, value: undefined } : result;
    },
  };
}
