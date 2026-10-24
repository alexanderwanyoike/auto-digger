import type { DatabaseSync } from 'node:sqlite';
import { catalogueViewSchema } from '../../shared/catalogue';
import type { CatalogueResult, CatalogueView } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';
import { releaseSchema } from '../../shared/discogs';
import { trackKey } from './trackKey';

function json(value: unknown): unknown {
  if (typeof value !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch {
    return null;
  }
}

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
  const entries = rows.map((row) => {
    const release = releaseSchema.safeParse(json(row.metadata));
    if (!release.success) return { release: null, tracks: [] };
    const marks = database
      .prepare('SELECT track_key,picked,tags FROM track_marks WHERE crate_id=? AND release_id=?')
      .all(typeof id === 'string' ? id : '', release.data.id);
    return {
      release: release.data,
      tracks: release.data.tracks.map((track, index) => {
        const occurrence = release.data.tracks
          .slice(0, index)
          .filter(
            (previous) => previous.position === track.position && previous.title === track.title,
          ).length;
        const key = trackKey(track, occurrence);
        const mark = marks.find((item) => item.track_key === key);
        return { ...track, key, picked: mark?.picked === 1, tags: mark ? json(mark.tags) : [] };
      }),
    };
  });
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
