import type { CosineQuery, CosineResult, Recommendations } from '../../shared/cosine';
import { cosineFailure } from '../../shared/cosine-failure';
import { distinctTracks, similarSchema } from './response';
import { createCosineRequest } from './request';
import { discoverSeeds } from './discovery';

export async function fetchSimilar(
  query: CosineQuery,
  key: string,
  request: typeof fetch,
): Promise<CosineResult<Recommendations>> {
  const read = createCosineRequest(key, request);
  const discovered = await discoverSeeds(query, read);
  if (!discovered.ok) return discovered;
  const candidates = discovered.value;
  if (candidates.length !== 1)
    return cosineFailure(
      'ambiguous',
      'Cosine found several versions for this upload. Try a more specific upload.',
    );
  const seed = candidates[0];
  if (!seed || !/^[\w-]{1,100}$/.test(seed.id))
    return cosineFailure('invalid-response', 'Cosine returned an invalid track reference.');
  const params = new URLSearchParams({ limit: '10', page: '1' });
  if (query.fromYear !== undefined) params.set('start_year', query.fromYear.toString());
  if (query.toYear !== undefined) params.set('end_year', query.toYear.toString());
  const similar = await read(
    `tracks/${encodeURIComponent(seed.id)}/similar?${params.toString()}`,
    similarSchema,
  );
  return similar.ok
    ? {
        ok: true,
        value: {
          seed,
          tracks: distinctTracks(similar.value, seed),
        },
      }
    : similar;
}
