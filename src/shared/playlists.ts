import { z } from 'zod';
import { releaseSchema } from './discogs';
import type { CatalogueResult } from './catalogue';

export const likesId = 'likes';
const playlistId = z.union([z.literal(likesId), z.uuid()]);
export const playlistNameSchema = z.string().trim().min(1).max(80);
export const playlistTrackInput = z
  .object({
    release: releaseSchema,
    trackIndex: z.number().int().nonnegative(),
  })
  .refine(({ release, trackIndex }) => Boolean(release.tracks[trackIndex]));
export const playlistEntrySchema = z.object({ id: z.string(), track: playlistTrackInput });
export const playlistsSchema = z.array(
  z.object({ id: playlistId, name: playlistNameSchema, entries: z.array(playlistEntrySchema) }),
);
export const addPlaylistEntry = z.object({ playlistId, track: playlistTrackInput });
export const removePlaylistEntry = z.object({ playlistId, entryId: z.string().min(1).max(100) });

export type PlaylistTrack = z.infer<typeof playlistTrackInput>;
export type Playlist = z.infer<typeof playlistsSchema>[number];
export type PlaylistsResult = CatalogueResult<Playlist[]>;
export interface PlaylistsBridge {
  read: () => Promise<PlaylistsResult>;
  create: (name: string) => Promise<PlaylistsResult>;
  add: (input: z.infer<typeof addPlaylistEntry>) => Promise<PlaylistsResult>;
  remove: (input: z.infer<typeof removePlaylistEntry>) => Promise<PlaylistsResult>;
}
