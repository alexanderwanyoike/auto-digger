import { z } from 'zod';
import { personalTagsSchema } from './catalogue';
import { crateErrorSchema } from './crate';
import { discogsErrorSchema } from './discogs';
import type { Result } from './result';
import { researchNoteInputSchema } from './research-notes';
import { researchSearchInputSchema } from './research-search';

const crateId = z.string().min(1).max(100);
const releaseId = z.number().int().positive();
export const researchInputs = {
  list_crates: z.object({}).strict(),
  get_crate: z.object({ crateId }).strict(),
  create_crate: z.object({ name: z.string().trim().min(1).max(80) }).strict(),
  search_releases: researchSearchInputSchema.strict(),
  get_release: z.object({ releaseId }).strict(),
  add_release: z.object({ crateId, releaseId }).strict(),
  annotate_track: z
    .object({
      crateId,
      releaseId,
      trackKey: z.string().regex(/^[a-f0-9]{64}$/),
      picked: z.boolean(),
      tags: personalTagsSchema,
    })
    .strict(),
  save_research: researchNoteInputSchema,
};
export const researchCommandSchema = z.discriminatedUnion('name', [
  z.object({ name: z.literal('list_crates'), arguments: researchInputs.list_crates }).strict(),
  z.object({ name: z.literal('get_crate'), arguments: researchInputs.get_crate }).strict(),
  z.object({ name: z.literal('create_crate'), arguments: researchInputs.create_crate }).strict(),
  z
    .object({ name: z.literal('search_releases'), arguments: researchInputs.search_releases })
    .strict(),
  z.object({ name: z.literal('get_release'), arguments: researchInputs.get_release }).strict(),
  z.object({ name: z.literal('add_release'), arguments: researchInputs.add_release }).strict(),
  z
    .object({ name: z.literal('annotate_track'), arguments: researchInputs.annotate_track })
    .strict(),
  z.object({ name: z.literal('save_research'), arguments: researchInputs.save_research }).strict(),
]);
const errorSchema = z.union([crateErrorSchema, discogsErrorSchema]);
export type ResearchResult = Result<unknown, z.infer<typeof errorSchema>>;
export const researchResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value: z.unknown() }),
  z.object({ ok: z.literal(false), error: errorSchema }),
]);
