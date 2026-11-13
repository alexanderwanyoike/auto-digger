import { z } from 'zod';
import { emptyFilters } from './default-filters';
import type { FollowTopic } from './following';
import { searchPageSchema } from './search';
import type { DigFilters } from './search';

export const discoveryShelfSchema = z.enum(['starter', 'follows']);
export type DiscoveryShelf = z.infer<typeof discoveryShelfSchema>;

const discoveryCursorSchema = z.object({
  id: z.uuid(),
  source: z.number().int().nonnegative(),
  page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
});
export const discoveryPageRequestSchema = z.object({
  shelf: discoveryShelfSchema,
  cursor: discoveryCursorSchema.nullable(),
});
export const discoveryPageSchema = z.object({
  releases: searchPageSchema.shape.releases,
  next: discoveryCursorSchema.nullable(),
});
export type DiscoveryPageRequest = z.infer<typeof discoveryPageRequestSchema>;
export type DiscoveryPage = z.infer<typeof discoveryPageSchema>;

export const starterStyle = 'Progressive House';

export function filtersForTopic(topic: FollowTopic, year = ''): DigFilters {
  const filters = { ...emptyFilters, year };
  if (topic.kind === 'genre') return { ...filters, genre: [topic.name] };
  return { ...filters, [topic.kind]: topic.name };
}
