import type { CosineError, CosineQuery, CosineResult, Recommendation } from '../../shared/cosine';
import { cosineFailure } from '../../shared/cosine-failure';
import { videoId } from '../../shared/youtube-video-id';
import { lookupSchema } from './response';
import type { createCosineRequest } from './request';

function normalise(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
function artistName(value: string) {
  return value.replace(/\s+\(\d+\)$/, '').trim();
}
export async function discoverSeeds(
  query: CosineQuery,
  read: ReturnType<typeof createCosineRequest>,
): Promise<CosineResult<{ seeds: Recommendation[]; incomplete: boolean }>> {
  let failure: CosineError | undefined;
  let named: Recommendation[] = [];
  if (query.artist && query.title) {
    const artist = artistName(query.artist);
    const params = new URLSearchParams({ q: `${artist} - ${query.title}`, limit: '10', page: '1' });
    const searched = await read(`search?${params.toString()}`, lookupSchema);
    if (!searched.ok && ['unauthorized', 'rate-limited'].includes(searched.error.code))
      return searched;
    if (!searched.ok && searched.error.code !== 'not-found') failure = searched.error;
    if (searched.ok)
      named = searched.value
        .filter(
          (item) =>
            normalise(artistName(item.artist)) === normalise(artist) &&
            normalise(item.title) === normalise(query.title ?? ''),
        )
        .slice(0, 10);
  }
  const url = `https://www.youtube.com/watch?v=${videoId(query.url) ?? ''}`;
  const lookup = await read(
    `tracks/lookup?${new URLSearchParams({ url }).toString()}`,
    lookupSchema,
  );
  if (!lookup.ok && ['unauthorized', 'rate-limited'].includes(lookup.error.code)) return lookup;
  if (!lookup.ok && lookup.error.code !== 'not-found') failure ??= lookup.error;
  let linked = [
    ...new Map(
      (lookup.ok ? lookup.value : []).map((item) => [item.id, { ...item, youtubeUrl: url }]),
    ).values(),
  ];
  if (linked.length > 1) {
    const confirmed = linked.filter(
      (item) =>
        query.artist &&
        query.title &&
        normalise(artistName(item.artist)) === normalise(artistName(query.artist)) &&
        normalise(item.title) === normalise(query.title),
    );
    if (confirmed.length) linked = confirmed.slice(0, 10);
    else {
      const error = {
        code: 'ambiguous' as const,
        message: 'Cosine found several versions for this upload. Try a more specific upload.',
      };
      if (!named.length) return { ok: false, error };
      failure ??= error;
      linked = [];
    }
  }
  const candidates = [...new Map([...named, ...linked].map((item) => [item.id, item])).values()];
  if (!candidates.length && failure) return { ok: false, error: failure };
  if (!candidates.length)
    return cosineFailure(
      'not-found',
      query.artist
        ? 'No confirmed match was found by artist/title or YouTube link.'
        : 'Cosine has not indexed this upload. Try another upload.',
    );
  return { ok: true, value: { seeds: candidates, incomplete: Boolean(failure) } };
}
