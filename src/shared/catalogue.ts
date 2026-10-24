import { z } from 'zod';
import { releaseSchema } from './discogs';
import type { CrateError } from './crate';
import type { Result } from './result';

export const crateSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  releaseCount: z.number().int().nonnegative(),
});
export const crateEntrySchema = z.object({ release: releaseSchema });
export const catalogueViewSchema = z.object({
  crates: z.array(crateSummarySchema),
  crateId: z.string().nullable(),
  entries: z.array(crateEntrySchema),
});
export type CatalogueView = z.infer<typeof catalogueViewSchema>;
export type CatalogueResult<T> = Result<T, CrateError>;
