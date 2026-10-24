import { z } from 'zod';
import { releaseSchema } from './discogs';
import type { CrateError } from './crate';
import type { Result } from './result';

export const crateSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  releaseCount: z.number().int().nonnegative(),
});
export const personalTagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform((tags) =>
    tags.filter(
      (tag, index) =>
        tags.findIndex((candidate) => candidate.toLowerCase() === tag.toLowerCase()) === index,
    ),
  );
export const markedTrackSchema = z.object({
  key: z.string().regex(/^[a-f0-9]{64}$/),
  position: z.string(),
  title: z.string(),
  duration: z.string(),
  picked: z.boolean(),
  tags: personalTagsSchema,
});
export const crateEntrySchema = z.object({
  release: releaseSchema,
  tracks: z.array(markedTrackSchema),
});
export const catalogueViewSchema = z.object({
  crates: z.array(crateSummarySchema),
  crateId: z.string().nullable(),
  entries: z.array(crateEntrySchema),
});
export type CatalogueView = z.infer<typeof catalogueViewSchema>;
export type CatalogueResult<T> = Result<T, CrateError>;
