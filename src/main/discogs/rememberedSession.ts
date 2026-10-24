import { discogsFailure } from '../../shared/discogsFailure';
import type { DiscogsAccount, DiscogsResult } from '../../shared/discogs';
import type { createTokenStore } from '../credentials/tokenStore';
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
  function authorized<T>(operation: () => Promise<DiscogsResult<T>>): Promise<DiscogsResult<T>> {
    return serialize(async () => {
      const result = await operation();
      if (!result.ok && result.error.code === 'unauthorized') {
        const removed = await tokens.clear();
        if (!removed.ok)
          return discogsFailure('unauthorized', `${result.error.message} ${removed.error.message}`);
      }
      return result;
    });
  }
  return {
    loadRelease: (input: unknown) => authorized(() => session.loadRelease(input)),
    researchSearch: (input: unknown) => authorized(() => session.researchSearch(input)),
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
