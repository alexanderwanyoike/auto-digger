import { z } from 'zod';

export const playbackItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  album: z.string(),
  artworkUrl: z.string().nullable(),
  url: z.string().regex(/^auto-digger-audio:\/\/(track|preview)\/[\w-]+$/),
  source: z.enum(['preview', 'download']),
});
export type PlaybackItem = z.infer<typeof playbackItemSchema>;
