import { abortableDiscogs } from './abortable';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsAccount, DiscogsResult } from '../../shared/discogs';
import type { createTokenStore } from '../credentials/token-store';
import type { createDiscogsSession } from './session';

export function createRememberedSession(
  session: ReturnType<typeof createDiscogsSession>,
  tokens: ReturnType<typeof createTokenStore>,
) {
  let queue: Promise<void> = Promise.resolve();
  function serialize<T>(operation: () => Promise<DiscogsResult<T>>): Promise<DiscogsResult<T>> {
    const pending = queue.then(operation);
    queue = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }
  function authorized<T>(
    operation: () => Promise<DiscogsResult<T>>,
    signal?: AbortSignal,
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
      }),
      signal,
    );
  }
  return {
    loadRelease: (input: unknown, signal?: AbortSignal) =>
      authorized(() => session.loadRelease(input, signal), signal),
    researchSearch: (input: unknown, signal?: AbortSignal) =>
      authorized(() => session.researchSearch(input, signal), signal),
    search: (input: unknown) => authorized(() => session.search(input)),
    dig: (input: unknown) => authorized(() => session.dig(input)),
    account: () =>
      serialize<DiscogsAccount | null>(async () => {
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
        session.disconnect();
        return tokens.clear();
      }),
  };
}
