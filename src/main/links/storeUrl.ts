import { z } from 'zod';
import { releaseSchema } from '../../shared/discogs';
import { storePlatforms } from '../../shared/storeLinks';
import type { StoreLinkResult } from '../../shared/storeLinks';

export function storeUrl(input: unknown): StoreLinkResult<string> {
  const parsed = z
    .object({ platform: z.enum(storePlatforms), release: releaseSchema })
    .safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: { code: 'invalid-input', message: 'Choose a store and a complete Discogs release.' },
    };
  const { platform, release } = parsed.data;
  if (platform === 'discogs')
    return { ok: true, value: `https://www.discogs.com/sell/release/${release.id.toString()}` };
  const urls = {
    beatport: 'https://www.beatport.com/search',
    traxsource: 'https://www.traxsource.com/search',
    bandcamp: 'https://bandcamp.com/search',
  };
  const url = new URL(urls[platform]);
  url.searchParams.set(
    platform === 'traxsource' ? 'term' : 'q',
    `${release.artists.join(' ')} ${release.title}`.trim(),
  );
  return { ok: true, value: url.href };
}
