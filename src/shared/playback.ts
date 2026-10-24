import { z } from 'zod';
import type { LocalTrack } from './audio';

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
export function downloadedPlayback(track: LocalTrack): PlaybackItem {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    artworkUrl: track.artworkUrl,
    url: `auto-digger-audio://track/${track.id}`,
    source: 'download',
  };
}
