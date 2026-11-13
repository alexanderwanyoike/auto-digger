import type { DatabaseSync } from 'node:sqlite';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogue-failure';

export function createCrateTaste(connection: () => Promise<CatalogueResult<DatabaseSync>>) {
  return async (): Promise<CatalogueResult<{ style: string; releases: number }[]>> => {
    const database = await connection();
    if (!database.ok) return database;
    try {
      const rows = database.value
        .prepare(
          `SELECT TRIM(style.value) AS style, COUNT(DISTINCT personal.release_id) AS releases
            FROM personal_crate_saves personal
            JOIN releases record ON record.id = personal.release_id
            JOIN json_each(record.metadata, '$.styles') style
            WHERE style.type = 'text' AND TRIM(style.value) <> ''
            GROUP BY TRIM(style.value)
            ORDER BY releases DESC, TRIM(style.value) COLLATE NOCASE, TRIM(style.value)`,
        )
        .all();
      return {
        ok: true,
        value: rows.flatMap(({ style, releases }) =>
          typeof style === 'string' && typeof releases === 'number' ? [{ style, releases }] : [],
        ),
      };
    } catch {
      return catalogueFailure('storage', 'Your saved styles could not be read.');
    }
  };
}
