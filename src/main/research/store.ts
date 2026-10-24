import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';
import { researchNoteInputSchema } from '../../shared/researchNotes';
import type { ResearchNote } from '../../shared/researchNotes';
import { readCatalogueView } from '../catalogue/readView';
import { readResearchNotes } from './readNotes';

export function createResearchStore(connection: () => Promise<CatalogueResult<DatabaseSync>>) {
  return {
    async list(crateId: string): Promise<CatalogueResult<ResearchNote[]>> {
      const result = await connection();
      if (!result.ok) return result;
      try {
        return readResearchNotes(result.value, crateId);
      } catch {
        return catalogueFailure('storage', 'Your research could not be read. Please retry.');
      }
    },
    async save(input: unknown, signal?: AbortSignal): Promise<CatalogueResult<ResearchNote>> {
      const parsed = researchNoteInputSchema.safeParse(input);
      if (!parsed.success)
        return catalogueFailure(
          'invalid-input',
          'Use valid research details, source links and a saved track for confirmed matches.',
        );
      const result = await connection();
      if (!result.ok) return result;
      if (signal?.aborted)
        return catalogueFailure('unavailable', 'Research access has stopped. No note was saved.');
      try {
        const view = readCatalogueView(result.value, parsed.data.crateId);
        if (!view.ok) return view;
        const { releaseId, trackKey, crateId } = parsed.data;
        const entry = view.value.entries.find((item) => item.release.id === releaseId);
        if (
          (releaseId !== null && !entry) ||
          (trackKey !== null && !entry?.tracks.some((track) => track.key === trackKey))
        )
          return catalogueFailure(
            'invalid-input',
            'Add the identified release and choose a saved track before linking this research.',
          );
        const note = { ...parsed.data, id: parsed.data.id ?? randomUUID() };
        const existing = result.value
          .prepare('SELECT crate_id FROM research_notes WHERE id=?')
          .get(note.id);
        if (existing && existing.crate_id !== crateId)
          return catalogueFailure('invalid-input', 'This research note belongs to another crate.');
        result.value
          .prepare(
            'INSERT INTO research_notes(id,crate_id,metadata) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata',
          )
          .run(note.id, crateId, JSON.stringify(note));
        return { ok: true, value: note };
      } catch {
        return catalogueFailure('storage', 'Your research could not be saved. Please retry.');
      }
    },
  };
}
