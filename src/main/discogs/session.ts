import { followTopicSchema } from '../../shared/following';
import { searchTopicArtwork } from './topic-artwork';
import { researchSearchInputSchema } from '../../shared/research-search';
import { createDigger } from './digger';
import { digInputSchema } from '../../shared/dig';
import type { DigResult } from '../../shared/dig';
import { accountSchema } from '../../shared/discogs';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsAccount, DiscogsRelease, DiscogsResult } from '../../shared/discogs';
import { releaseMetadataSchema } from './release-metadata';
import { requestDiscogs } from './request';
import { searchDiscogs } from './search';
import { createDiscogsReadCache } from './read-cache';
import { createDiscogsRequestBudget } from './request-budget';
import { searchInputSchema } from '../../shared/search';
import type { SearchPage } from '../../shared/search';

export function createDiscogsSession(
  request: typeof fetch = (input, init) => fetch(input, init),
  budget = createDiscogsRequestBudget(),
) {
  let account: DiscogsAccount | null = null;
  let acceptedToken: string | null = null;
  let revision = 0;
  const searches = createDiscogsReadCache<SearchPage>();
  const releases = createDiscogsReadCache<DiscogsRelease>();
  const portraits = createDiscogsReadCache<string | null>();
  const release = (id: number, token: string, signal?: AbortSignal) => {
    const read = () =>
      requestDiscogs(`/releases/${id.toString()}`, token, releaseMetadataSchema, request, {
        budget,
        ...(signal ? { signal } : {}),
      });
    return signal ? read() : releases.read(id.toString(), read);
  };
  const createSessionDigger = () =>
    createDigger(
      (filters, page) => searchDiscogs({ filters, page }, acceptedToken ?? '', request, { budget }),
      (id) => release(id, acceptedToken ?? ''),
    );
  const digger = createSessionDigger();
  const artistDigger = createSessionDigger();
  const clear = () => {
    searches.clear();
    releases.clear();
    portraits.clear();
    digger.reset();
    artistDigger.reset();
    revision += 1;
    account = null;
    acceptedToken = null;
  };

  return {
    account(): DiscogsResult<DiscogsAccount | null> {
      return { ok: true, value: account };
    },
    disconnect(): DiscogsResult<undefined> {
      clear();
      return { ok: true, value: undefined };
    },
    async dig(input: unknown): Promise<DiscogsResult<DigResult>> {
      if (!acceptedToken)
        return discogsFailure('unauthorized', 'Connect your Discogs account first.');
      const parsed = digInputSchema.safeParse(input);
      if (!parsed.success) return discogsFailure('invalid-input', 'Use valid digging filters.');
      const started = revision;
      const activeDigger = parsed.data.context === 'artist' ? artistDigger : digger;
      const result = await activeDigger.next(parsed.data.filters, parsed.data.reset);
      if (started !== revision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      if (!result.ok && result.error.code === 'unauthorized') clear();
      return result;
    },
    async topicArtwork(input: unknown): Promise<DiscogsResult<string | null>> {
      const parsed = followTopicSchema.safeParse(input);
      if (!parsed.success || parsed.data.kind === 'genre')
        return discogsFailure('invalid-input', 'Choose a Discogs artist or label.');
      if (!acceptedToken)
        return discogsFailure('unauthorized', 'Connect your Discogs account first.');
      const started = revision;
      const topic = parsed.data;
      const token = acceptedToken;
      const result = await portraits.read(JSON.stringify(topic), () =>
        searchTopicArtwork(topic, token, request, { budget, background: true }),
      );
      if (started !== revision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      return result;
    },
    async search(input: unknown): Promise<DiscogsResult<SearchPage>> {
      if (!acceptedToken)
        return discogsFailure('unauthorized', 'Connect your Discogs account first.');
      const started = revision;
      const parsed = searchInputSchema.safeParse(input);
      if (!parsed.success)
        return discogsFailure(
          'invalid-input',
          'Use a year such as 1998 or a range such as 1990-1999, with the earlier year first.',
        );
      const token = acceptedToken;
      const { background, ...query } = parsed.data;
      const read = () =>
        searchDiscogs(query, token, request, { budget, background: background ?? false });
      const result = await (query.context === 'catalogue' || (background && query.page > 1)
        ? searches.read(JSON.stringify(query), read)
        : read());
      if (started !== revision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      if (!result.ok && result.error.code === 'unauthorized') clear();
      if (result.ok && parsed.data.context !== 'explore' && parsed.data.context !== 'catalogue') {
        const activeDigger = parsed.data.context === 'artist' ? artistDigger : digger;
        activeDigger.apply(parsed.data.filters);
      }
      return result;
    },
    async researchSearch(input: unknown, signal?: AbortSignal): Promise<DiscogsResult<SearchPage>> {
      if (!acceptedToken)
        return discogsFailure('unauthorized', 'Connect your Discogs account first.');
      const parsed = researchSearchInputSchema.safeParse(input);
      if (!parsed.success)
        return discogsFailure(
          'invalid-input',
          'Use valid Discogs research filters and a query of up to 160 characters.',
        );
      const started = revision;
      const result = await searchDiscogs(parsed.data, acceptedToken, request, {
        budget,
        query: parsed.data.query,
        ...(signal ? { signal } : {}),
      });
      if (started !== revision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      if (!result.ok && result.error.code === 'unauthorized') clear();
      return result;
    },
    async loadRelease(id: unknown, signal?: AbortSignal): Promise<DiscogsResult<DiscogsRelease>> {
      if (!acceptedToken)
        return discogsFailure('unauthorized', 'Connect your Discogs account first.');
      if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
        return discogsFailure('invalid-input', 'Enter a positive numeric Discogs release ID.');
      }
      const started = revision;
      const result = await release(id, acceptedToken, signal);
      if (started !== revision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      if (!result.ok && result.error.code === 'unauthorized') clear();
      return result;
    },
    async connect(token: unknown): Promise<DiscogsResult<DiscogsAccount>> {
      clear();
      if (
        typeof token !== 'string' ||
        !token.trim() ||
        /\s/.test(token.trim()) ||
        token.length > 256
      ) {
        return discogsFailure('invalid-input', 'Enter a valid Discogs personal token.');
      }
      const started = revision;
      const result = await requestDiscogs('/oauth/identity', token.trim(), accountSchema, request, {
        budget,
      });
      if (started !== revision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      if (result.ok) {
        account = result.value;
        acceptedToken = token.trim();
      }
      return result;
    },
  };
}
