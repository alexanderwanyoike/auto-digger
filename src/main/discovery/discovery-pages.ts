import { randomUUID } from 'node:crypto';
import { emptyFilters } from '../../shared/default-filters';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import { discoveryPageRequestSchema, filtersForTopic, starterStyle } from '../../shared/discovery';
import type { DiscoveryPage, DiscoveryShelf } from '../../shared/discovery';
import type { DigFilters } from '../../shared/search';
import type { FollowingResult } from '../../shared/following';
import type { CatalogueResult } from '../../shared/catalogue';
import type { createCrateTaste } from './crate-taste';
import { rankedStyles } from './ranked-styles';

export function createDiscoveryPages(
  search: DiscogsBridge['search'],
  crateTaste: ReturnType<typeof createCrateTaste>,
  readFollowing: () => Promise<FollowingResult>,
  seenReleases: () => Promise<CatalogueResult<Set<number>>>,
) {
  const walks = new Map<DiscoveryShelf, { id: string; filters: DigFilters[] }>();

  async function start(shelf: DiscoveryShelf) {
    if (shelf === 'follows') {
      const follows = await readFollowing();
      if (!follows.ok) return discogsFailure('unavailable', follows.error.message);
      return { ok: true as const, value: follows.value.map((topic) => filtersForTopic(topic)) };
    }
    const taste = await crateTaste();
    if (!taste.ok) return discogsFailure('unavailable', taste.error.message);
    const styles = rankedStyles(taste.value);
    return {
      ok: true as const,
      value: (styles.length ? styles : [starterStyle]).map((style) => ({
        ...emptyFilters,
        style: [style],
      })),
    };
  }

  return async (input: unknown): Promise<DiscogsResult<DiscoveryPage>> => {
    const parsed = discoveryPageRequestSchema.safeParse(input);
    if (!parsed.success) return discogsFailure('invalid-input', 'Choose a valid discovery page.');
    const { shelf, cursor } = parsed.data;
    let walk = walks.get(shelf);
    if (!cursor) {
      const filters = await start(shelf);
      if (!filters.ok) return filters;
      walk = { id: randomUUID(), filters: filters.value };
      walks.set(shelf, walk);
    }
    if (!walk || (cursor && cursor.id !== walk.id))
      return discogsFailure('cancelled', 'Reopen this discovery page to continue.');
    const source = cursor?.source ?? 0;
    const page = cursor?.page ?? 1;
    const filters = walk.filters[source];
    if (!filters) return { ok: true, value: { releases: [], next: null } };

    const result = await search({ filters, page, context: 'explore' });
    if (!result.ok) return result;
    const known = await seenReleases();
    if (!known.ok) return discogsFailure('unavailable', known.error.message);
    const releases = result.value.releases.filter(({ id }) => !known.value.has(id));
    const nextPage = { id: walk.id, source, page: page + 1 };
    const nextSource = walk.filters[source + 1]
      ? { id: walk.id, source: source + 1, page: 1 }
      : null;
    return {
      ok: true,
      value: { releases, next: page < result.value.pages ? nextPage : nextSource },
    };
  };
}
