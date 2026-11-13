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
  const collections = new Map<
    DiscoveryShelf,
    { id: string; filters: DigFilters[]; pageCounts: Map<number, number> }
  >();

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
    let collection = collections.get(shelf);
    if (!cursor) {
      const filters = await start(shelf);
      if (!filters.ok) return filters;
      collection = { id: randomUUID(), filters: filters.value, pageCounts: new Map() };
      collections.set(shelf, collection);
    }
    if (!collection || (cursor && cursor.id !== collection.id))
      return discogsFailure('cancelled', 'Reopen this discovery page to continue.');
    const source = cursor?.source ?? 0;
    const page = cursor?.page ?? 1;
    const filters = collection.filters[source];
    if (!filters) return { ok: true, value: { releases: [], next: null } };

    const result = await search({ filters, page, context: 'explore' });
    if (!result.ok) return result;
    const known = await seenReleases();
    if (!known.ok) return discogsFailure('unavailable', known.error.message);
    const releases = result.value.releases.filter(({ id }) => !known.value.has(id));
    const { id, filters: sources, pageCounts } = collection;
    pageCounts.set(source, result.value.pages);
    const hasPage = (index: number, target: number) => (pageCounts.get(index) ?? 200) >= target;
    const laterSource = sources.findIndex((_, index) => index > source && hasPage(index, page));
    if (laterSource !== -1)
      return { ok: true, value: { releases, next: { id, source: laterSource, page } } };
    const firstSource = sources.findIndex((_, index) => hasPage(index, page + 1));
    const next = firstSource === -1 ? null : { id, source: firstSource, page: page + 1 };
    return { ok: true, value: { releases, next } };
  };
}
