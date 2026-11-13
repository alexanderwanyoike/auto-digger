import { abortableDiscogs } from './abortable';
import { createDiscogsRequestQueue } from './request-queue';
import { createDiscogsReadCache } from './read-cache';
import { searchInputSchema } from '../../shared/search';
import type { SearchPage } from '../../shared/search';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsAccount, DiscogsResult } from '../../shared/discogs';
import type { createTokenStore } from '../credentials/token-store';
import type { createDiscogsSession } from './session';

export function createRememberedSession(
  session: ReturnType<typeof createDiscogsSession>,
  tokens: ReturnType<typeof createTokenStore>,
) {
  const serialize = createDiscogsRequestQueue();
  let credentialRevision = 0;
  let activeRange = '';
  let rangeRevision = 0;
  const pendingSearches = createDiscogsReadCache<SearchPage>();
  function authorized<T>(
    operation: () => Promise<DiscogsResult<T>>,
    signal?: AbortSignal,
    background = false,
  ): Promise<DiscogsResult<T>> {
    return abortableDiscogs(
      serialize(async () => {
        if (signal?.aborted)
          return discogsFailure('cancelled', 'This Discogs request was cancelled.');
        const result = await operation();
        if (!result.ok && result.error.code === 'unauthorized') {
          const removed = await tokens.clear();
          if (!removed.ok)
            return discogsFailure(
              'unauthorized',
              `${result.error.message} ${removed.error.message}`,
            );
        }
        return result;
      }, background),
      signal,
    );
  }
  async function readTopic<T>(
    operation: () => Promise<DiscogsResult<T>>,
    background: boolean,
  ): Promise<DiscogsResult<T>> {
    const revision = credentialRevision;
    await serialize(() => Promise.resolve(), background);
    if (revision !== credentialRevision)
      return discogsFailure('cancelled', 'The Discogs session has changed.');
    const result = await operation();
    if (result.ok || result.error.code !== 'unauthorized') return result;
    return serialize(async () => {
      if (revision !== credentialRevision)
        return discogsFailure('cancelled', 'The Discogs session has changed.');
      credentialRevision += 1;
      pendingSearches.clear();
      session.disconnect();
      const removed = await tokens.clear();
      return removed.ok
        ? result
        : discogsFailure('unauthorized', `${result.error.message} ${removed.error.message}`);
    });
  }
  return {
    loadRelease: (input: unknown, signal?: AbortSignal) =>
      authorized(() => session.loadRelease(input, signal), signal),
    researchSearch: (input: unknown, signal?: AbortSignal) =>
      authorized(() => session.researchSearch(input, signal), signal),
    topicArtwork: (input: unknown) => readTopic(() => session.topicArtwork(input), false),
    search: (input: unknown) => {
      const parsed = searchInputSchema.safeParse(input);
      if (!parsed.success) return authorized(() => session.search(input));
      const revision = credentialRevision;
      const { context, filters, order, background, topic } = parsed.data;
      if (context === 'explore' && topic && topic.kind !== 'genre')
        return readTopic(() => session.search(parsed.data), background ?? false);
      const isRange = context === 'catalogue-range';
      if (isRange) {
        const key = JSON.stringify({ filters, order });
        if (key !== activeRange) {
          activeRange = key;
          rangeRevision += 1;
        }
      }
      const requestedRange = isRange ? rangeRevision : undefined;
      const search = () =>
        authorized(
          () => {
            if (revision !== credentialRevision)
              return Promise.resolve(
                discogsFailure('cancelled', 'The Discogs session has changed.'),
              );
            if (requestedRange !== undefined && requestedRange !== rangeRevision)
              return Promise.resolve(
                discogsFailure('cancelled', 'The Catalogue range has changed.'),
              );
            return session.search(parsed.data);
          },
          undefined,
          background,
        );
      return pendingSearches.read(JSON.stringify([parsed.data, requestedRange]), search, false);
    },
    dig: (input: unknown) => authorized(() => session.dig(input)),
    account: () =>
      serialize<DiscogsResult<DiscogsAccount | null>>(async () => {
        const current = session.account();
        if (!current.ok || current.value) return current;
        const stored = await tokens.load();
        if (!stored.ok) return stored;
        if (stored.value === null) return current;
        const restored = await session.connect(stored.value);
        if (!restored.ok && restored.error.code === 'unauthorized') {
          const removed = await tokens.clear();
          if (!removed.ok) return removed;
        }
        return restored;
      }),
    connect: (input: unknown) =>
      serialize(async () => {
        credentialRevision += 1;
        pendingSearches.clear();
        const token = typeof input === 'string' ? input.trim() : '';
        const connected = await session.connect(token);
        if (!connected.ok) return connected;
        const saved = await tokens.save(token);
        if (!saved.ok) {
          session.disconnect();
          return saved;
        }
        return connected;
      }),
    disconnect: () =>
      serialize(async () => {
        credentialRevision += 1;
        pendingSearches.clear();
        session.disconnect();
        return tokens.clear();
      }),
  };
}
