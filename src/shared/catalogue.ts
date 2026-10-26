import { z } from 'zod';
import { researchNoteSchema } from './research-notes';
import { releaseSchema } from './discogs';
import type { CrateError } from './crate';
import type { Result } from './result';
import type { DiscogsRelease } from './discogs';

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
  research: z.array(researchNoteSchema).optional(),
});
export type CatalogueView = z.infer<typeof catalogueViewSchema>;
export type CatalogueResult<T> = Result<T, CrateError>;
export type CatalogueViewResult = CatalogueResult<CatalogueView>;
export interface CatalogueBridge {
  onChanged?: (callback: () => void) => () => void;
  view: (crateId?: string) => Promise<CatalogueViewResult>;
  create: (name: string) => Promise<CatalogueViewResult>;
  rename: (input: { crateId: string; name: string }) => Promise<CatalogueViewResult>;
  deleteCrate: (crateId: string) => Promise<CatalogueViewResult>;
  add: (input: { crateId: string; release: DiscogsRelease }) => Promise<CatalogueViewResult>;
  remove: (input: { crateId: string; releaseId: number }) => Promise<CatalogueViewResult>;
  annotate: (input: {
    crateId: string;
    releaseId: number;
    trackKey: string;
    picked: boolean;
    tags: string[];
  }) => Promise<CatalogueViewResult>;
}
export const catalogueChannels = {
  view: 'catalogue:view',
  create: 'catalogue:create',
  rename: 'catalogue:rename',
  deleteCrate: 'catalogue:delete',
  add: 'catalogue:add',
  remove: 'catalogue:remove',
  annotate: 'catalogue:annotate',
} as const;
