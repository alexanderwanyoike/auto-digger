import { z } from 'zod';
import { emptyFilters } from './default-filters';
import type { FollowTopic } from './following';
import type { DigFilters } from './search';

export const discoveryShelfSchema = z.enum(['starter', 'follows']);
export type DiscoveryShelf = z.infer<typeof discoveryShelfSchema>;

export const starterStyle = 'Progressive House';

export function filtersForTopic(topic: FollowTopic, year = ''): DigFilters {
  const filters = { ...emptyFilters, year };
  if (topic.kind === 'genre') return { ...filters, genre: [topic.name] };
  return { ...filters, [topic.kind]: topic.name };
}
