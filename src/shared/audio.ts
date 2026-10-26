import { z } from 'zod';
import { releaseSchema } from './discogs';
import type { DiscogsRelease } from './discogs';
import type { Result } from './result';

export const audioErrorSchema = z.object({
  code: z.enum([
    'invalid-data',
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
export const trackIdSchema = z.string().regex(/^[1-9]\d*-(?:[\w-]{11}|slsk-[a-f0-9]{32})$/);
export const localTrackSchema = z
  .object({
    id: trackIdSchema,
    releaseId: z.number().int().positive(),
    videoId: z
      .string()
      .regex(/^[\w-]{11}$/)
      .nullable(),
    provider: z.enum(['youtube', 'soulseek']).optional(),
    soulseek: z
      .object({ username: z.string(), filename: z.string(), size: z.number().int().positive() })
      .optional(),
    title: z.string(),
    sourceTitle: z.string(),
    trackIndex: z.number().int().nonnegative().nullable(),
    artist: z.string(),
    album: z.string(),
    artworkUrl: z.string().nullable(),
    filename: z
      .string()
      .max(240)
      .regex(/^[^/\\]+\.(?:yt\.mp3|slsk\.(?:mp3|flac|wav|m4a|ogg|opus|aiff?))$/)
      .refine((value) =>
        Array.from(value).every((character) => (character.codePointAt(0) ?? 0) >= 32),
      ),
    warning: z.string().nullable(),
    missing: z.boolean().optional(),
  })
  .refine((track) =>
    track.provider === 'soulseek'
      ? track.videoId === null &&
        track.soulseek !== undefined &&
        track.id.startsWith(`${track.releaseId.toString()}-slsk-`) &&
        track.filename.includes('.slsk.')
      : track.videoId !== null &&
        track.soulseek === undefined &&
        track.id === `${track.releaseId.toString()}-${track.videoId}` &&
        track.filename.endsWith('.yt.mp3'),
  );
export type LocalTrack = z.infer<typeof localTrackSchema>;
export const youtubeDownloadInputSchema = z.object({
  release: releaseSchema,
  videoIndex: z.number().int().nonnegative(),
  trackIndex: z.number().int().nonnegative().nullable().optional(),
});
export interface YouTubeDownloadInput {
  release: DiscogsRelease;
  videoIndex: number;
  trackIndex?: number | null | undefined;
}
export const soulseekDownloadInputSchema = z.object({
  provider: z.literal('soulseek'),
  release: releaseSchema,
  trackIndex: z.number().int().nonnegative(),
  candidateId: z.string().regex(/^[a-f0-9]{32}$/),
});
export type SoulseekDownloadInput = z.infer<typeof soulseekDownloadInputSchema>;
export const downloadInputSchema = z.union([
  soulseekDownloadInputSchema,
  youtubeDownloadInputSchema,
]);
export type DownloadInput = YouTubeDownloadInput | SoulseekDownloadInput;
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
