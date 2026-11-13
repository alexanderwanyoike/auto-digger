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
  return {
    loadRelease: (input: unknown, signal?: AbortSignal) =>
      authorized(() => session.loadRelease(input, signal), signal),
    researchSearch: (input: unknown, signal?: AbortSignal) =>
      authorized(() => session.researchSearch(input, signal), signal),
    topicArtwork: (input: unknown) => {
      const revision = credentialRevision;
      return serialize(
        () =>
          revision === credentialRevision
            ? session.topicArtwork(input)
            : Promise.resolve(discogsFailure('cancelled', 'The Discogs session has changed.')),
        true,
      );
    },
    search: (input: unknown) => {
      const parsed = searchInputSchema.safeParse(input);
      if (!parsed.success) return authorized(() => session.search(input));
      const revision = credentialRevision;
      const search = () =>
        authorized(
          () =>
            revision === credentialRevision
              ? session.search(parsed.data)
              : Promise.resolve(discogsFailure('cancelled', 'The Discogs session has changed.')),
          undefined,
          parsed.data.background,
        );
      return pendingSearches.read(JSON.stringify(parsed.data), search, false);
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
