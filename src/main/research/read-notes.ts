import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { researchNoteSchema } from '../../shared/research-notes';
import type { ResearchNote } from '../../shared/research-notes';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogue-failure';

export function readResearchNotes(
  database: DatabaseSync,
  crateId: string,
): CatalogueResult<ResearchNote[]> {
  if (!database.prepare('SELECT id FROM crates WHERE id=?').get(crateId))
    return catalogueFailure('invalid-input', 'Choose an existing crate for this research.');
  try {
    const rows = database
      .prepare('SELECT id,metadata FROM research_notes WHERE crate_id=? ORDER BY rowid')
      .all(crateId);
    const notes = rows.map((row) => {
      const json: unknown = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : null;
      const parsed = researchNoteSchema.safeParse(json);
      return parsed.success && parsed.data.id === row.id && parsed.data.crateId === crateId
        ? parsed.data
        : null;
    });
    const parsed = z.array(researchNoteSchema).safeParse(notes);
    return parsed.success
      ? {
          ok: true,
          value: parsed.data.sort(
            (left, right) =>
              (left.trackNumber ?? Number.MAX_SAFE_INTEGER) -
              (right.trackNumber ?? Number.MAX_SAFE_INTEGER),
          ),
        }
      : catalogueFailure(
          'invalid-data',
          'Saved research is unreadable. Its data has been preserved.',
        );
  } catch {
    return catalogueFailure(
      'invalid-data',
      'Saved research is unreadable. Its data has been preserved.',
    );
  }
}
