import type { DatabaseSync } from 'node:sqlite';
import { catalogueFailure } from '../../shared/catalogue-failure';
import { playlistsSchema } from '../../shared/playlists';
import type { PlaylistsResult } from '../../shared/playlists';

export function readPlaylists(database: DatabaseSync): PlaylistsResult {
  const playlists = database
    .prepare("SELECT id, name FROM playlists ORDER BY id <> 'likes', name COLLATE NOCASE")
    .all();
  const entries = database
    .prepare(
      `
    SELECT e.playlist_id, t.id, t.metadata FROM playlist_entries e
    JOIN playlist_tracks t ON e.track_id=t.id ORDER BY e.ordinal
  `,
    )
    .all();
  const byPlaylist = new Map<unknown, unknown[]>();
  entries.forEach((entry) => {
    const entriesForPlaylist = byPlaylist.get(entry.playlist_id) ?? [];
    const track: unknown = typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : null;
    entriesForPlaylist.push({ id: entry.id, track });
    byPlaylist.set(entry.playlist_id, entriesForPlaylist);
  });
  const parsed = playlistsSchema.safeParse(
    playlists.map((list) => ({ ...list, entries: byPlaylist.get(list.id) ?? [] })),
  );
  return parsed.success
    ? { ok: true, value: parsed.data }
    : catalogueFailure('invalid-data', 'Your playlists could not be read.');
}
