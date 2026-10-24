import type { DatabaseSync } from 'node:sqlite';
import { isAbsolute } from 'node:path';
import { z } from 'zod';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';
import { localTrackSchema } from '../../shared/audio';

const directorySchema = z.string().max(4096).refine(isAbsolute);
const recordSchema = z.object({ directory: directorySchema, track: localTrackSchema });
export type DownloadRecord = z.infer<typeof recordSchema>;

export function createDownloadIndex(connection: () => Promise<CatalogueResult<DatabaseSync>>) {
  async function accessDatabase<T>(
    operation: (database: DatabaseSync) => CatalogueResult<T>,
  ): Promise<CatalogueResult<T>> {
    const result = await connection();
    if (!result.ok) return result;
    try {
      return operation(result.value);
    } catch {
      return catalogueFailure(
        'storage',
        'The download index could not be read or saved. Please retry.',
      );
    }
  }
  return {
    directories: () =>
      accessDatabase<string[]>((database) => {
        const parsed = z.array(directorySchema).safeParse(
          database
            .prepare('SELECT path FROM download_directories ORDER BY path')
            .all()
            .map((row) => row.path),
        );
        return parsed.success
          ? { ok: true, value: parsed.data }
          : catalogueFailure(
              'invalid-data',
              'Saved download locations are unreadable. Their data has been preserved.',
            );
      }),
    rememberDirectory(input: unknown) {
      const parsed = directorySchema.safeParse(input);
      if (!parsed.success)
        return Promise.resolve(
          catalogueFailure<undefined>('invalid-input', 'Choose an absolute downloads directory.'),
        );
      return accessDatabase<undefined>((database) => {
        database
          .prepare('INSERT OR IGNORE INTO download_directories(path) VALUES(?)')
          .run(parsed.data);
        return { ok: true, value: undefined };
      });
    },
    list: () =>
      accessDatabase<DownloadRecord[]>((database) => {
        const rows = database
          .prepare('SELECT id,directory,metadata FROM downloads ORDER BY id')
          .all();
        const records = rows.map((row) => {
          const json: unknown = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : null;
          const parsed = recordSchema.safeParse({ directory: row.directory, track: json });
          return parsed.success && parsed.data.track.id === row.id ? parsed.data : null;
        });
        if (records.some((record) => record === null))
          return catalogueFailure(
            'invalid-data',
            'Saved download metadata is unreadable. Its data has been preserved.',
          );
        return { ok: true, value: records.filter((record) => record !== null) };
      }),
    save(input: unknown) {
      const parsed = recordSchema.safeParse(input);
      if (!parsed.success)
        return Promise.resolve(
          catalogueFailure<undefined>(
            'invalid-input',
            'Choose a valid downloaded track and location.',
          ),
        );
      return accessDatabase<undefined>((database) => {
        database
          .prepare(
            'INSERT INTO downloads(id,directory,metadata) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET directory=excluded.directory,metadata=excluded.metadata',
          )
          .run(parsed.data.track.id, parsed.data.directory, JSON.stringify(parsed.data.track));
        return { ok: true, value: undefined };
      });
    },
  };
}
