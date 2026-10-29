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
  const seeds = discovered.value;
  const seed = seeds[0];
  if (!seed || seeds.some((item) => !/^[\w-]{1,100}$/.test(item.id)))
    return cosineFailure('invalid-response', 'Cosine returned an invalid track reference.');
  const params = new URLSearchParams({ limit: '10', page: '1' });
  if (query.fromYear !== undefined) params.set('start_year', query.fromYear.toString());
  if (query.toYear !== undefined) params.set('end_year', query.toYear.toString());
  const results = await Promise.all(
    seeds.map((item) =>
      read(`tracks/${encodeURIComponent(item.id)}/similar?${params.toString()}`, similarSchema),
    ),
  );
  const tracks = [];
  for (const result of results) {
    if (!result.ok) return result;
    tracks.push(...result.value);
  }
  return { ok: true, value: { seed, seeds, tracks: distinctTracks(tracks, seeds) } };
}
