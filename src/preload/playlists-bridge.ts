import { z } from 'zod';
import { playlistsSchema } from '../shared/playlists';
import type { PlaylistsBridge, PlaylistsResult } from '../shared/playlists';
import { crateErrorSchema } from '../shared/crate';
import { catalogueFailure } from '../shared/catalogue-failure';

const responseSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value: playlistsSchema }),
  z.object({ ok: z.literal(false), error: crateErrorSchema }),
]);

export function createPlaylistsBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): PlaylistsBridge {
  async function call(channel: string, input?: unknown): Promise<PlaylistsResult> {
    try {
      const response = responseSchema.safeParse(await invoke(channel, input));
      if (response.success) return response.data;
    } catch {
      return catalogueFailure('unavailable', 'Your playlists could not be reached. Please retry.');
    }
    return catalogueFailure('invalid-data', 'Your playlists could not be read.');
  }
  return {
    read: () => call('playlists:read'),
    create: (name) => call('playlists:create', name),
    add: (input) => call('playlists:add', input),
    remove: (input) => call('playlists:remove', input),
  };
}
