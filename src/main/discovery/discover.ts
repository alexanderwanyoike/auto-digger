import type { FollowingResult } from '../../shared/following';
import { followTopicKey, followTopicSchema } from '../../shared/following';
import type { CatalogueResult } from '../../shared/catalogue';
import { filtersForTopic, starterStyle } from '../../shared/discovery';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import type { DigFilters, SearchPage } from '../../shared/search';
import { filtersSchema } from '../../shared/search';
import { emptyFilters } from '../../shared/default-filters';
import type { createCrateTaste } from './crate-taste';

function shuffled<T>(items: readonly T[]): T[] {
  const pool = [...items];
  return items.flatMap(() => {
    const index = Math.floor(Math.random() * pool.length);
    const picked = pool[index];
    const last = pool.pop();
    if (picked === undefined || last === undefined) return [];
    if (index < pool.length) pool[index] = last;
    return [picked];
  });
}

function createReleaseDiscovery(
  search: DiscogsBridge['search'],
  seenReleases: () => Promise<CatalogueResult<Set<number>>>,
  shelfSize: number,
) {
  return async (criteria: DigFilters[]): Promise<DiscogsResult<SearchPage['releases']>> => {
    const candidates = new Map<number, SearchPage['releases'][number]>();
    const collect = (page: SearchPage) => {
      page.releases.forEach((release) => candidates.set(release.id, release));
    };
    const searchTopic = async (index: number): Promise<DiscogsResult<undefined>> => {
      const filters = criteria[index];
      if (!filters) return { ok: true, value: undefined };
      const first = await search({ filters, page: 1, context: 'explore' });
      if (!first.ok) return first;
      collect(first.value);
      if (first.value.pages > 1) {
        const page = 2 + Math.floor(Math.random() * (Math.min(first.value.pages, 200) - 1));
        const sampled = await search({ filters, page, context: 'explore' });
        if (!sampled.ok) return sampled;
        collect(sampled.value);
      }
      return searchTopic(index + 1);
    };
    const searched = await searchTopic(0);
    if (!searched.ok) return searched;
    const known = await seenReleases();
    if (!known.ok) return discogsFailure('unavailable', known.error.message);
    const unseen = [...candidates.values()].filter(({ id }) => !known.value.has(id));
    return { ok: true, value: shuffled(unseen).slice(0, shelfSize) };
  };
}

export function createDiscover(
  search: DiscogsBridge['search'],
  readFollowing: () => Promise<FollowingResult>,
  knownReleases: () => Promise<CatalogueResult<Set<number>>>,
) {
  const discover = createReleaseDiscovery(search, knownReleases, 8);
  return async (input: unknown): Promise<DiscogsResult<SearchPage['releases']>> => {
    const selected = followTopicSchema.nullable().safeParse(input);
    if (!selected.success)
      return discogsFailure('invalid-input', 'Choose a followed artist, label or genre.');
    const following = await readFollowing();
    if (!following.ok) return discogsFailure('unavailable', following.error.message);
    const selectedKey = selected.data && followTopicKey(selected.data);
    const topics = selectedKey
      ? following.value.filter((topic) => followTopicKey(topic) === selectedKey)
      : shuffled(following.value).slice(0, 3);
    if (!topics.length)
      return discogsFailure(
        'invalid-input',
        'Follow an artist, label or genre to discover releases.',
      );
    return discover(topics.map((topic) => filtersForTopic(topic)));
  };
}

export function createStarterShelf(
  search: DiscogsBridge['search'],
  seenReleases: () => Promise<CatalogueResult<Set<number>>>,
  crateTaste: ReturnType<typeof createCrateTaste>,
  readFollowing: () => Promise<FollowingResult>,
) {
  const size = 6;
  const discover = createReleaseDiscovery(search, seenReleases, size);
  return async () => {
    const taste = await crateTaste();
    if (!taste.ok) return discogsFailure('unavailable', taste.error.message);
    const styles = taste.value
      .flatMap(({ style }) => {
        const parsed = filtersSchema.shape.style.safeParse([style]);
        return parsed.success ? parsed.data : [];
      })
      .slice(0, 3);
    if (!styles.length) {
      const follows = await readFollowing();
      if (!follows.ok) return discogsFailure('unavailable', follows.error.message);
      const topics = shuffled(follows.value).slice(0, 3);
      return discover(
        topics.length
          ? topics.map((topic) => filtersForTopic(topic))
          : [{ ...emptyFilters, style: [starterStyle] }],
      );
    }

    const chosen = new Map<number, SearchPage['releases'][number]>();
    async function collectStyle(index: number): Promise<DiscogsResult<SearchPage['releases']>> {
      const style = styles[index];
      if (!style || chosen.size >= size)
        return { ok: true, value: [...chosen.values()].slice(0, size) };
      const matches = await discover([{ ...emptyFilters, style: [style] }]);
      if (!matches.ok) return matches;
      matches.value.forEach((release) => chosen.set(release.id, release));
      return collectStyle(index + 1);
    }
    return collectStyle(0);
  };
}
