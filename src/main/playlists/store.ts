import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogue-failure';
import { addPlaylistEntry, playlistNameSchema, removePlaylistEntry } from '../../shared/playlists';
import type { PlaylistsResult, PlaylistTrack } from '../../shared/playlists';
import { trackPosition } from '../../shared/track-position';
import { trackKey } from '../catalogue/track-key';
import { readPlaylists } from './read-playlists';

function entryKey({ release, trackIndex }: PlaylistTrack): string | null {
  const track = trackPosition(release, trackIndex);
  return track ? `${release.id.toString()}-${trackKey(track, track.occurrence)}` : null;
}

export function createPlaylistsStore(connection: () => Promise<CatalogueResult<DatabaseSync>>) {
  async function change(
    update?: (database: DatabaseSync) => CatalogueResult<undefined>,
  ): Promise<PlaylistsResult> {
    const result = await connection();
    if (!result.ok) return result;
    const database = result.value;
    try {
      if (!update) return readPlaylists(database);
      database.exec('BEGIN IMMEDIATE');
      const updated = update(database);
      const playlists = updated.ok ? readPlaylists(database) : updated;
      database.exec(playlists.ok ? 'COMMIT' : 'ROLLBACK');
      return playlists;
    } catch {
      if (database.isOpen && database.isTransaction) database.exec('ROLLBACK');
      return catalogueFailure(
        'storage',
        'Your playlists could not be saved or read. Please retry.',
      );
    }
  }
  return {
    read: () => change(),
    create(input: unknown): Promise<PlaylistsResult> {
      const name = playlistNameSchema.safeParse(input);
      if (!name.success)
        return Promise.resolve(catalogueFailure('invalid-input', 'Give your playlist a name.'));
      return change((database) => {
        const result = database
          .prepare('INSERT INTO playlists(id, name) VALUES (?, ?) ON CONFLICT(name) DO NOTHING')
          .run(randomUUID(), name.data);
        return result.changes
          ? { ok: true, value: undefined }
          : catalogueFailure('invalid-input', 'You already have a playlist with this name.');
      });
    },
    add(input: unknown): Promise<PlaylistsResult> {
      const parsed = addPlaylistEntry.safeParse(input);
      if (!parsed.success)
        return Promise.resolve(
          catalogueFailure('invalid-input', 'Choose an existing track and playlist.'),
        );
      const { playlistId, track } = parsed.data;
      const id = entryKey(track);
      if (!id)
        return Promise.resolve(
          catalogueFailure('invalid-input', 'Choose a track on this release.'),
        );
      return change((database) => {
        if (!database.prepare('SELECT id FROM playlists WHERE id = ?').get(playlistId))
          return catalogueFailure('invalid-input', 'This playlist no longer exists.');
        database
          .prepare(
            'INSERT INTO playlist_tracks(id, metadata) VALUES(?, ?) ON CONFLICT(id) DO NOTHING',
          )
          .run(id, JSON.stringify(track));
        database
          .prepare(
            'INSERT INTO playlist_entries(playlist_id, track_id) VALUES(?, ?) ON CONFLICT(playlist_id, track_id) DO NOTHING',
          )
          .run(playlistId, id);
        return { ok: true, value: undefined };
      });
    },
    remove(input: unknown): Promise<PlaylistsResult> {
      const parsed = removePlaylistEntry.safeParse(input);
      if (!parsed.success)
        return Promise.resolve(
          catalogueFailure('invalid-input', 'Choose a track in this playlist.'),
        );
      return change((database) => {
        const { playlistId, entryId } = parsed.data;
        database
          .prepare('DELETE FROM playlist_entries WHERE playlist_id = ? AND track_id = ?')
          .run(playlistId, entryId);
        database
          .prepare(
            'DELETE FROM playlist_tracks WHERE id = ? AND NOT EXISTS (SELECT 1 FROM playlist_entries WHERE track_id = ?)',
          )
          .run(entryId, entryId);
        return { ok: true, value: undefined };
      });
    },
  };
}
