import type { FollowingResult } from '../../shared/following';
import { followTopicKey, followTopicSchema } from '../../shared/following';
import type { CatalogueResult } from '../../shared/catalogue';
import { filtersForTopic } from '../../shared/discovery';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import type { SearchPage } from '../../shared/search';

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

export function createDiscover(
  search: DiscogsBridge['search'],
  readFollowing: () => Promise<FollowingResult>,
  knownReleases: () => Promise<CatalogueResult<Set<number>>>,
) {
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
    const candidates = new Map<number, SearchPage['releases'][number]>();
    const collect = (page: SearchPage) => {
      page.releases.forEach((release) => candidates.set(release.id, release));
    };
    const searchTopic = async (index: number): Promise<DiscogsResult<undefined>> => {
      const topic = topics[index];
      if (!topic) return { ok: true, value: undefined };
      const filters = filtersForTopic(topic);
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
    const known = await knownReleases();
    if (!known.ok) return discogsFailure('unavailable', known.error.message);
    const unseen = [...candidates.values()].filter(({ id }) => !known.value.has(id));
    return { ok: true, value: shuffled(unseen).slice(0, 8) };
  };
}
