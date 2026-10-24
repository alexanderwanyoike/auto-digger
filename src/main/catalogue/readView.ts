import type { DatabaseSync } from 'node:sqlite';
import { catalogueViewSchema } from '../../shared/catalogue';
import type { CatalogueResult, CatalogueView } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';

export function readCatalogueView(
  database: DatabaseSync,
  crateId?: string,
): CatalogueResult<CatalogueView> {
  const crates = database
    .prepare(
      'SELECT c.id,c.name,COUNT(e.release_id) AS releaseCount FROM crates c LEFT JOIN entries e ON e.crate_id=c.id GROUP BY c.id ORDER BY c.ordinal,c.id',
    )
    .all();
  const id = crateId ?? crates[0]?.id;
  if (crateId && !crates.some((crate) => crate.id === crateId))
    return catalogueFailure('invalid-input', 'Choose an existing crate.');
  const rows =
    typeof id === 'string'
      ? database
          .prepare(
            'SELECT r.metadata FROM entries e JOIN releases r ON r.id=e.release_id WHERE e.crate_id=? ORDER BY e.ordinal,e.release_id',
          )
          .all(id)
      : [];
  const entries = rows.map((row) => ({
    release: typeof row.metadata === 'string' ? (JSON.parse(row.metadata) as unknown) : null,
  }));
  const parsed = catalogueViewSchema.safeParse({
    crates,
    crateId: typeof id === 'string' ? id : null,
    entries,
  });
  return parsed.success
    ? { ok: true, value: parsed.data }
    : catalogueFailure(
        'invalid-data',
        'Saved catalogue metadata is unreadable. Its files have been preserved.',
      );
}
