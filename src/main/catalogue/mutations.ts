import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { releaseSchema } from '../../shared/discogs';
import type { CatalogueResult, CatalogueView } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';
import { readCatalogueView } from './readView';
import { personalTagsSchema } from '../../shared/catalogue';
const annotationSchema = z.object({
  crateId: z.string(),
  releaseId: z.number().int().positive(),
  trackKey: z.string(),
  picked: z.boolean(),
  tags: personalTagsSchema,
});

const nameSchema = z.string().trim().min(1).max(80);
const idSchema = z.string().min(1).max(100);
const renameSchema = z.object({ crateId: idSchema, name: nameSchema });
const addSchema = z.object({ crateId: idSchema, release: releaseSchema });
const removeSchema = z.object({ crateId: idSchema, releaseId: z.number().int().positive() });

export function catalogueMutations(database: DatabaseSync) {
  function exists(id: string) {
    return Boolean(database.prepare('SELECT id FROM crates WHERE id=?').get(id));
  }
  return {
    annotate(input: unknown): CatalogueResult<CatalogueView> {
      const parsed = annotationSchema.safeParse(input);
      if (!parsed.success)
        return catalogueFailure(
          'invalid-input',
          'Choose a saved track and up to 20 personal tags.',
        );
      const { crateId, releaseId, trackKey: key, picked, tags } = parsed.data;
      const view = readCatalogueView(database, crateId);
      if (!view.ok) return view;
      if (
        !view.value.entries
          .find((entry) => entry.release.id === releaseId)
          ?.tracks.some((track) => track.key === key)
      )
        return catalogueFailure('invalid-input', 'Choose a track saved in this crate.');
      database
        .prepare(
          'INSERT INTO track_marks(crate_id,release_id,track_key,picked,tags) VALUES(?,?,?,?,?) ON CONFLICT(crate_id,release_id,track_key) DO UPDATE SET picked=excluded.picked,tags=excluded.tags',
        )
        .run(crateId, releaseId, key, picked ? 1 : 0, JSON.stringify(tags));
      return readCatalogueView(database, crateId);
    },
    create(input: unknown): CatalogueResult<CatalogueView> {
      const name = nameSchema.safeParse(input);
      if (!name.success)
        return catalogueFailure('invalid-input', 'Give the crate a name of 1 to 80 characters.');
      if (database.prepare('SELECT id FROM crates WHERE name=? COLLATE NOCASE').get(name.data))
        return catalogueFailure('invalid-input', 'A crate with this name already exists.');
      const id = randomUUID();
      database
        .prepare(
          'INSERT INTO crates(id,name,ordinal) VALUES(?,?,(SELECT COALESCE(MAX(ordinal)+1,0) FROM crates))',
        )
        .run(id, name.data);
      return readCatalogueView(database, id);
    },
    rename(input: unknown): CatalogueResult<CatalogueView> {
      const parsed = renameSchema.safeParse(input);
      if (!parsed.success || !exists(parsed.data.crateId))
        return catalogueFailure('invalid-input', 'Choose a crate and a valid name.');
      const { crateId, name } = parsed.data;
      if (
        database
          .prepare('SELECT id FROM crates WHERE name=? COLLATE NOCASE AND id<>?')
          .get(name, crateId)
      )
        return catalogueFailure('invalid-input', 'A crate with this name already exists.');
      database.prepare('UPDATE crates SET name=? WHERE id=?').run(name, crateId);
      return readCatalogueView(database, crateId);
    },
    deleteCrate(input: unknown): CatalogueResult<CatalogueView> {
      const id = idSchema.safeParse(input);
      if (!id.success || !exists(id.data))
        return catalogueFailure('invalid-input', 'Choose an existing crate.');
      database.prepare('DELETE FROM crates WHERE id=?').run(id.data);
      return readCatalogueView(database);
    },
    add(input: unknown): CatalogueResult<CatalogueView> {
      const parsed = addSchema.safeParse(input);
      if (!parsed.success || !exists(parsed.data.crateId))
        return catalogueFailure('invalid-input', 'Choose a crate and a complete Discogs release.');
      const { crateId, release } = parsed.data;
      database
        .prepare('INSERT OR IGNORE INTO releases(id,metadata) VALUES(?,?)')
        .run(release.id, JSON.stringify(release));
      database
        .prepare(
          'INSERT OR IGNORE INTO entries(crate_id,release_id,ordinal) VALUES(?,?,(SELECT COALESCE(MAX(ordinal)+1,0) FROM entries WHERE crate_id=?))',
        )
        .run(crateId, release.id, crateId);
      return readCatalogueView(database, crateId);
    },
    remove(input: unknown): CatalogueResult<CatalogueView> {
      const parsed = removeSchema.safeParse(input);
      if (!parsed.success || !exists(parsed.data.crateId))
        return catalogueFailure('invalid-input', 'Choose a saved release in an existing crate.');
      database
        .prepare('DELETE FROM entries WHERE crate_id=? AND release_id=?')
        .run(parsed.data.crateId, parsed.data.releaseId);
      return readCatalogueView(database, parsed.data.crateId);
    },
  };
}
