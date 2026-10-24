import { expect, test } from 'vitest';
import { storeUrl } from './storeUrl';
import { loadedRelease } from '../../../tests/discogsFixtures';

test('links to sellers for the exact pressing and encoded artist/title searches', () => {
  const release = { ...loadedRelease, title: 'Night & Day / Dub?', artists: ['A+B'] };
  expect(storeUrl({ platform: 'discogs', release })).toEqual({
    ok: true,
    value: 'https://www.discogs.com/sell/release/12',
  });
  (['beatport', 'traxsource', 'bandcamp'] as const).forEach((platform) => {
    const result = storeUrl({ platform, release });
    if (!result.ok) throw new Error(result.error.message);
    const url = new URL(result.value);
    expect(url.protocol).toBe('https:');
    expect(url.searchParams.get(platform === 'traxsource' ? 'term' : 'q')).toBe(
      'A+B Night & Day / Dub?',
    );
  });
  expect(storeUrl({ platform: 'file', release }).ok).toBe(false);
  expect(storeUrl({ platform: 'discogs', release: { ...release, id: -1 } }).ok).toBe(false);
});
