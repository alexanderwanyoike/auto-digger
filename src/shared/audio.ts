import { z } from 'zod';
import { releaseSchema } from './discogs';
import type { DiscogsRelease } from './discogs';
import type { Result } from './result';

export const audioErrorSchema = z.object({
  code: z.enum(['invalid-input', 'unavailable', 'tools', 'network', 'storage', 'busy']),
  message: z.string(),
});
export type AudioError = z.infer<typeof audioErrorSchema>;
export type AudioResult<T> = Result<T, AudioError>;
export const sourceSchema = z.object({
  videoId: z.string().regex(/^[\w-]{11}$/),
  title: z.string(),
});
export type AudioSource = z.infer<typeof sourceSchema>;
export const trackIdSchema = z.string().regex(/^[1-9]\d*-[\w-]{11}$/);
export const localTrackSchema = z.object({
  id: trackIdSchema,
  releaseId: z.number().int().positive(),
  videoId: z.string().regex(/^[\w-]{11}$/),
  title: z.string(),
  artist: z.string(),
  album: z.string(),
  artworkUrl: z.string().nullable(),
  filename: z
    .string()
    .max(240)
    .regex(/^[^/\\\x00-\x1f]+\.yt\.mp3$/),
  warning: z.string().nullable(),
});
export type LocalTrack = z.infer<typeof localTrackSchema>;
export const downloadInputSchema = z.object({
  release: releaseSchema,
  videoIndex: z.number().int().nonnegative(),
  trackIndex: z.number().int().nonnegative().nullable().optional(),
});
export interface DownloadInput {
  release: DiscogsRelease;
  videoIndex: number;
  trackIndex?: number | null;
}
export const audioChannels = {
  list: 'audio:list',
  probe: 'audio:probe',
  download: 'audio:download',
  reveal: 'audio:reveal',
} as const;
export interface AudioBridge {
  list: () => Promise<AudioResult<LocalTrack[]>>;
  probe: (url: string) => Promise<AudioResult<AudioSource>>;
  download: (input: DownloadInput) => Promise<AudioResult<LocalTrack>>;
  reveal: (id?: string) => Promise<AudioResult<undefined>>;
}
