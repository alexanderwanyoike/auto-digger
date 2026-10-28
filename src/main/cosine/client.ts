import type { z } from 'zod';
import type { CosineQuery, CosineResult, Recommendations } from '../../shared/cosine';
import { cosineFailure } from '../../shared/cosine-failure';
import { videoId } from '../../shared/youtube-video-id';
import { distinctTracks, lookupSchema, similarSchema } from './response';

export async function fetchSimilar(
  query: CosineQuery,
  key: string,
  request: typeof fetch,
): Promise<CosineResult<Recommendations>> {
  async function read<T>(path: string, schema: z.ZodType<T>): Promise<CosineResult<T>> {
    try {
      const response = await request(`https://cosine.club/api/v1/${path}`, {
        headers: {
          Authorization: `Bearer ${key}`,
          'User-Agent': 'AutoDigger/0.1 (https://github.com/alexanderwanyoike/auto-digger)',
          Accept: 'application/json',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
      if ([401, 403].includes(response.status))
        return cosineFailure('unauthorized', 'Cosine rejected the API key. Update it in Settings.');
      if (response.status === 404)
        return cosineFailure(
          'not-found',
          'Cosine has not indexed this upload. Try another upload of the track.',
        );
      if (response.status === 429)
        return cosineFailure(
          'rate-limited',
          'Cosine is busy. Wait a minute before requesting more recommendations.',
        );
      if (!response.ok)
        return cosineFailure('network', 'Cosine could not complete the request. Please retry.');
      const raw: unknown = await response.json();
      const clean: unknown = JSON.parse(
        JSON.stringify(raw, (_name, value: unknown) =>
          typeof value === 'string' ? value.split(key).join('[redacted]') : value,
        ),
      );
      const parsed = schema.safeParse(clean);
      return parsed.success
        ? { ok: true, value: parsed.data }
        : cosineFailure(
            'invalid-response',
            'Cosine returned recommendations the app could not read.',
          );
    } catch {
      return cosineFailure('network', 'Could not reach Cosine. Check your connection and retry.');
    }
  }
  const url = `https://www.youtube.com/watch?v=${videoId(query.url) ?? ''}`;
  const lookup = await read(
    `tracks/lookup?${new URLSearchParams({ url }).toString()}`,
    lookupSchema,
  );
  if (!lookup.ok) return lookup;
  const candidates = [...new Map(lookup.value.map((item) => [item.id, item])).values()];
  if (!candidates.length)
    return cosineFailure('not-found', 'Cosine has not indexed this upload. Try another upload.');
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
          seed: { ...seed, youtubeUrl: url },
          tracks: distinctTracks(similar.value, { ...seed, youtubeUrl: url }),
        },
      }
    : similar;
}
