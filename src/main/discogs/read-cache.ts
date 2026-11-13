import type { DiscogsResult } from '../../shared/discogs';

const lifetime = 5 * 60_000;
const capacity = 128;

export function createDiscogsReadCache<T>() {
  const entries = new Map<string, { result: Promise<DiscogsResult<T>>; expires: number }>();
  return {
    read(key: string, load: () => Promise<DiscogsResult<T>>) {
      const cached = entries.get(key);
      if (cached && cached.expires > Date.now()) return cached.result;
      entries.delete(key);
      const entry = {
        expires: Infinity,
        result: load().then(
          (result) => {
            if (entries.get(key) === entry) {
              if (result.ok) entry.expires = Date.now() + lifetime;
              else entries.delete(key);
            }
            return result;
          },
          (error: unknown) => {
            if (entries.get(key) === entry) entries.delete(key);
            throw error;
          },
        ),
      };
      entries.set(key, entry);
      const oldest = entries.keys().next().value;
      if (entries.size > capacity && oldest !== undefined) entries.delete(oldest);
      return entry.result;
    },
    clear() {
      entries.clear();
    },
  };
}
