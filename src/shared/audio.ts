import { z } from 'zod';
import { releaseSchema } from './discogs';
import type { DiscogsRelease } from './discogs';
import type { Result } from './result';
import type { PlaybackItem } from './playback';

export const audioErrorSchema = z.object({
  code: z.enum([
    'invalid-input',
    'unavailable',
    'tools',
    'network',
    'storage',
    'busy',
    'cancelled',
  ]),
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
  sourceTitle: z.string(),
  trackIndex: z.number().int().nonnegative().nullable(),
  artist: z.string(),
  album: z.string(),
  artworkUrl: z.string().nullable(),
  filename: z
    .string()
    .max(240)
    .regex(/^[^/\\]+\.yt\.mp3$/)
    .refine((value) =>
      Array.from(value).every((character) => (character.codePointAt(0) ?? 0) >= 32),
    ),
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
  preview: 'audio:preview',
  stopPreview: 'audio:stop-preview',
  list: 'audio:list',
  probe: 'audio:probe',
  download: 'audio:download',
  reveal: 'audio:reveal',
} as const;
export interface AudioBridge {
  preview: (input: DownloadInput) => Promise<AudioResult<PlaybackItem>>;
  stopPreview: () => Promise<AudioResult<undefined>>;
  list: () => Promise<AudioResult<LocalTrack[]>>;
  probe: (url: string) => Promise<AudioResult<AudioSource>>;
  download: (input: DownloadInput) => Promise<AudioResult<LocalTrack>>;
  reveal: (id?: string) => Promise<AudioResult<undefined>>;
}
