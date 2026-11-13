import type { DatabaseSync } from 'node:sqlite';
import { historyEntrySchema, historyRecordSchema } from '../../shared/discovery-history';
import type { HistoryRecord } from '../../shared/discovery-history';
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
  const seen = (includeCrates = false) =>
    query(
      (database) =>
        new Set(
          database
            .prepare(
              includeCrates
                ? 'SELECT id FROM opened_releases UNION SELECT id FROM release_activity UNION SELECT release_id AS id FROM entries'
                : 'SELECT id FROM opened_releases UNION SELECT id FROM release_activity',
            )
            .all()
            .flatMap(({ id }) => (typeof id === 'number' ? [id] : [])),
        ),
    );
  return {
    opened: (id: number) =>
      query((database) => {
        database
          .prepare('INSERT INTO opened_releases(id) VALUES(?) ON CONFLICT(id) DO NOTHING')
          .run(id);
      }),
    record: (input: unknown) => {
      const parsed = historyRecordSchema.safeParse(input);
      if (!parsed.success)
        return Promise.resolve(
          catalogueFailure('invalid-input', 'Choose a valid release activity.'),
        );
      const { id, title, artist, artworkUrl, activity }: HistoryRecord = parsed.data;
      return query((database) => {
        database
          .prepare(
            `
          INSERT INTO release_activity(id,title,artist,artwork_url,played,last_activity)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title=CASE WHEN excluded.played=0 THEN excluded.title ELSE release_activity.title END,
            artist=CASE WHEN excluded.played=0 OR release_activity.artist=''
              THEN excluded.artist ELSE release_activity.artist END,
            artwork_url=COALESCE(excluded.artwork_url, release_activity.artwork_url),
            played=MAX(release_activity.played, excluded.played),
            last_activity=excluded.last_activity
        `,
          )
          .run(id, title, artist, artworkUrl, activity === 'played' ? 1 : 0, Date.now());
      });
    },
    list: () =>
      query((database) =>
        database
          .prepare(
            `
          SELECT id,title,artist,artwork_url AS artworkUrl,played FROM (
            SELECT id,title,artist,artwork_url,played,last_activity FROM release_activity
            UNION ALL
            SELECT id,'Release ' || id,'',NULL,0,0 FROM opened_releases
            WHERE id NOT IN (SELECT id FROM release_activity)
          )
          ORDER BY last_activity DESC, id DESC
        `,
          )
          .all()
          .map(({ played, ...entry }) =>
            historyEntrySchema.parse({ ...entry, played: played === 1 }),
          ),
      ),
    seen,
  };
}
