import { z } from 'zod';
import { filtersSchema } from './search';
import { releaseSchema } from './discogs';

export const digInputSchema = z.object({
  filters: filtersSchema,
  reset: z.boolean().default(false),
});
export const digResultSchema = z.object({
  release: releaseSchema,
  seen: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  limited: z.boolean(),
});
export type DigResult = z.infer<typeof digResultSchema>;
