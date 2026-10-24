import { z } from 'zod';
import { releaseSchema } from './discogs';
import type { DiscogsRelease } from './discogs';
import type { Result } from './result';

export const crateErrorSchema = z.object({
  code: z.enum(['invalid-input', 'invalid-data', 'storage', 'unavailable']),
  message: z.string(),
});
export type CrateError = z.infer<typeof crateErrorSchema>;
export type CrateResult = Result<DiscogsRelease[], CrateError>;
export const crateSchema = z.object({ version: z.literal(1), releases: z.array(releaseSchema) });
export const crateChannels = {
  list: 'crate:list',
  save: 'crate:save',
  remove: 'crate:remove',
} as const;
export interface CrateBridge {
  list: () => Promise<CrateResult>;
  save: (release: DiscogsRelease) => Promise<CrateResult>;
  remove: (id: number) => Promise<CrateResult>;
}
