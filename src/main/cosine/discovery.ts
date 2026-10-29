import type { CosineQuery, CosineResult, Recommendation } from '../../shared/cosine';
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
): Promise<CosineResult<Recommendation[]>> {
  let named: Recommendation[] = [];
  if (query.artist && query.title) {
    const artist = artistName(query.artist);
    const params = new URLSearchParams({ q: `${artist} - ${query.title}`, limit: '10', page: '1' });
    const searched = await read(`search?${params.toString()}`, lookupSchema);
    if (!searched.ok && searched.error.code !== 'not-found') return searched;
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
  if (!lookup.ok && lookup.error.code !== 'not-found') return lookup;
  const linked = [
    ...new Map(
      (lookup.ok ? lookup.value : []).map((item) => [item.id, { ...item, youtubeUrl: url }]),
    ).values(),
  ];
  if (linked.length > 1)
    return cosineFailure(
      'ambiguous',
      'Cosine found several versions for this upload. Try a more specific upload.',
    );
  const candidates = [...new Map([...named, ...linked].map((item) => [item.id, item])).values()];
  if (!candidates.length)
    return cosineFailure(
      'not-found',
      query.artist
        ? 'No confirmed match was found by artist/title or YouTube link.'
        : 'Cosine has not indexed this upload. Try another upload.',
    );
  return { ok: true, value: candidates };
}
