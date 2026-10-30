import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CosineBridge,
  CosineResult,
  Recommendation,
  Recommendations,
  ResolvedRecommendation,
} from '../../shared/cosine';
import { cosineFailure } from '../../shared/cosine-failure';

export function useRecommendationReleases(
  bridge: CosineBridge | undefined,
  data: Recommendations | null,
) {
  const cache = useRef(new Map<string, Promise<CosineResult<ResolvedRecommendation>>>());
  const revision = useRef(0);
  const [covers, setCovers] = useState<Record<number, { url: string | null; title: string }>>({});
  const clear = useCallback(() => {
    revision.current += 1;
    cache.current.clear();
    setCovers({});
  }, []);
  const read = useCallback(
    async (item: Recommendation): Promise<CosineResult<ResolvedRecommendation>> => {
      const existing = cache.current.get(item.id);
      if (existing) return existing;
      const version = revision.current;
      const pending = bridge
        ? bridge
            .resolve(item)
            .catch(() =>
              cosineFailure<ResolvedRecommendation>(
                'unavailable',
                'The linked release could not be loaded. Please retry.',
              ),
            )
        : Promise.resolve(
            cosineFailure<ResolvedRecommendation>(
              'unavailable',
              'Open the desktop app to load linked releases.',
            ),
          );
      cache.current.set(item.id, pending);
      const result = await pending;
      if (version === revision.current && cache.current.get(item.id) === pending) {
        if (result.ok) {
          const { release } = result.value;
          setCovers((previous) => ({
            ...previous,
            [release.id]: { url: release.artworkUrl, title: release.title },
          }));
        } else cache.current.delete(item.id);
      }
      return result;
    },
    [bridge],
  );
  useEffect(() => {
    let active = true;
    const version = revision.current;
    const seen = new Set<number>();
    const items =
      data?.tracks.filter((item) => {
        if (item.releaseId === null || seen.has(item.releaseId)) return false;
        seen.add(item.releaseId);
        return true;
      }) ?? [];
    async function next(index: number): Promise<void> {
      if (!active || version !== revision.current) return;
      const item = items[index];
      if (!item) return;
      await read(item);
      await next(index + 1);
    }
    next(0).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [data, read]);
  return { covers, read, clear };
}
