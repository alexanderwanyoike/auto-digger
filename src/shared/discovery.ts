import { emptyFilters } from './default-filters';
import type { FollowTopic } from './following';
import type { DigFilters } from './search';

export function filtersForTopic(topic: FollowTopic, year = ''): DigFilters {
  const filters = { ...emptyFilters, year };
  if (topic.kind === 'genre') return { ...filters, genre: [topic.name] };
  return { ...filters, [topic.kind]: topic.name };
}
