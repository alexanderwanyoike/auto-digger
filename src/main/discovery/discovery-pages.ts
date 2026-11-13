import { randomUUID } from 'node:crypto';
import { emptyFilters } from '../../shared/default-filters';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import { discoveryPageRequestSchema, filtersForTopic, starterStyle } from '../../shared/discovery';
import type { DiscoveryPage, DiscoveryShelf } from '../../shared/discovery';
import { maxSearchPage } from '../../shared/search';
import type { DigFilters } from '../../shared/search';
import { followTopicKey } from '../../shared/following';
import type { FollowTopic, FollowingResult } from '../../shared/following';
import type { CatalogueResult } from '../../shared/catalogue';
import type { createCrateTaste } from './crate-taste';
import { rankedStyles } from './ranked-styles';

interface DiscoverySource {
  filters: DigFilters;
  topic?: FollowTopic;
}

function splitByYear(filters: DigFilters): DigFilters[] {
  const [first, last = first] = filters.year ? filters.year.split('-').map(Number) : [1000, 9999];
  if (first === undefined || last === undefined || first >= last) return [];
  const middle = Math.floor((first + last) / 2);
  const range = (start: number, end: number) =>
    start === end ? start.toString() : `${start.toString()}-${end.toString()}`;
  return [
    { ...filters, year: range(first, middle) },
    { ...filters, year: range(middle + 1, last) },
  ];
}

export function createDiscoveryPages(
  search: DiscogsBridge['search'],
  crateTaste: ReturnType<typeof createCrateTaste>,
  readFollowing: () => Promise<FollowingResult>,
  seenReleases: () => Promise<CatalogueResult<Set<number>>>,
) {
  const collections = new Map<
    DiscoveryShelf,
    { id: string; sources: DiscoverySource[]; pageCounts: Map<number, number> }
  >();

  async function savedStyles(): Promise<DiscogsResult<DiscoverySource[]>> {
    const taste = await crateTaste();
    if (!taste.ok) return discogsFailure('unavailable', taste.error.message);
    const styles = rankedStyles(taste.value);
    return {
      ok: true,
      value: (styles.length ? styles : [starterStyle]).map((style) => ({
        filters: { ...emptyFilters, style: [style] },
      })),
    };
  }

  return async (input: unknown): Promise<DiscogsResult<DiscoveryPage>> => {
    const parsed = discoveryPageRequestSchema.safeParse(input);
    if (!parsed.success) return discogsFailure('invalid-input', 'Choose a valid discovery page.');
    const { shelf, cursor } = parsed.data;
    const follows = shelf === 'follows' ? await readFollowing() : null;
    if (follows && !follows.ok) return discogsFailure('unavailable', follows.error.message);
    let collection = collections.get(shelf);
    if (!cursor) {
      const started = follows
        ? {
            ok: true as const,
            value: follows.value.map((topic) => ({
              filters: filtersForTopic(topic),
              topic,
            })),
          }
        : await savedStyles();
      if (!started.ok) return started;
      collection = { id: randomUUID(), sources: started.value, pageCounts: new Map() };
      collections.set(shelf, collection);
    }
    if (!collection || (cursor && cursor.id !== collection.id))
      return discogsFailure('cancelled', 'Reopen this discovery page to continue.');
    const source = cursor?.source ?? 0;
    const page = cursor?.page ?? 1;
    const criteria = collection.sources[source];
    if (!criteria) return { ok: true, value: { releases: [], next: null } };

    const { id, sources, pageCounts } = collection;
    const { filters, topic } = criteria;
    const topicKey = topic ? followTopicKey(topic) : null;
    const current = !topicKey || follows?.value.some((item) => followTopicKey(item) === topicKey);
    let releases: DiscoveryPage['releases'] = [];
    if (current) {
      const result = await search({ filters, page, context: 'explore' });
      if (result.ok) {
        const known = await seenReleases();
        if (!known.ok) return discogsFailure('unavailable', known.error.message);
        releases = result.value.releases.filter(({ id: releaseId }) => !known.value.has(releaseId));
        const available = Math.min(result.value.pages, maxSearchPage);
        const capped = result.value.items > available * result.value.perPage;
        const partitions = page === 1 && capped ? splitByYear(filters) : [];
        if (partitions.length && !pageCounts.has(source))
          sources.push(...partitions.map((partition) => ({ ...criteria, filters: partition })));
        pageCounts.set(source, available);
      } else if (result.error.code === 'not-found') pageCounts.set(source, 0);
      else return result;
    } else pageCounts.set(source, 0);
    const hasPage = (index: number, target: number) =>
      (pageCounts.get(index) ?? maxSearchPage) >= target;
    const laterSource = sources.findIndex((_, index) => index > source && hasPage(index, page));
    if (laterSource !== -1)
      return { ok: true, value: { releases, next: { id, source: laterSource, page } } };
    const firstSource = sources.findIndex((_, index) => hasPage(index, page + 1));
    const next = firstSource === -1 ? null : { id, source: firstSource, page: page + 1 };
    return { ok: true, value: { releases, next } };
  };
}
