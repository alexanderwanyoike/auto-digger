import type { DatabaseSync } from 'node:sqlite';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogue-failure';

export function createDiscoveryHistory(connection: () => Promise<CatalogueResult<DatabaseSync>>) {
  async function query<T>(run: (database: DatabaseSync) => T): Promise<CatalogueResult<T>> {
    const result = await connection();
    if (!result.ok) return result;
    try {
      return { ok: true, value: run(result.value) };
    } catch {
      return catalogueFailure('storage', 'Your discovery history could not be reached.');
    }
  }
  return {
    opened: (id: number) =>
      query((database) => {
        database
          .prepare('INSERT INTO opened_releases(id) VALUES(?) ON CONFLICT(id) DO NOTHING')
          .run(id);
      }),
    seen: () =>
      query(
        (database) =>
          new Set(
            database
              .prepare('SELECT id FROM opened_releases')
              .all()
              .flatMap(({ id }) => (typeof id === 'number' ? [id] : [])),
          ),
      ),
  };
}
