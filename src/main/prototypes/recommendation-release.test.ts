import { expect, test, vi } from 'vitest';
import { releaseResponse } from '../../../tests/discogs-fixtures';
import { loadRecommendationRelease } from './recommendation-release';

const input = {
  sourceUrl: 'https://www.discogs.com/release/12',
  title: 'Quiet Orbit',
  artist: 'Low Tide',
};

test('loads the linked release using the existing metadata parser and checks the precise track', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(releaseResponse));
  const result = await loadRecommendationRelease(input, fetcher);
  expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.discogs.com/releases/12');
  expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).has('Authorization')).toBe(false);
  expect(result).toMatchObject({
    ok: true,
    value: { release: { id: 12, title: 'Quiet Orbit EP' }, trackIndex: 0 },
  });
});

test.each([
  'https://discogs.com.evil.example/release/12',
  'https://discogs.com/master/12',
  'http://127.0.0.1/release/12',
])('does not fetch an unverified release URL: %s', async (sourceUrl) => {
  const fetcher = vi.fn<typeof fetch>();
  expect(await loadRecommendationRelease({ ...input, sourceUrl }, fetcher)).toMatchObject({
    ok: false,
    error: { code: 'invalid-input' },
  });
  expect(fetcher).not.toHaveBeenCalled();
});

test('keeps missing and ambiguous mix matches unconfirmed instead of picking another version', async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
    Response.json({
      ...releaseResponse,
      tracklist: [
        { position: 'A', title: 'Quiet Orbit (Instrumental Mix)' },
        { position: 'B', title: 'Quiet Orbit (Vocal Mix)' },
      ],
    }),
  );
  expect(await loadRecommendationRelease(input, fetcher)).toMatchObject({
    ok: true,
    value: { trackIndex: null },
  });
  expect(
    await loadRecommendationRelease({ ...input, title: 'Quiet Orbit (Vocal Mix)' }, fetcher),
  ).toMatchObject({ ok: true, value: { trackIndex: 1 } });
});

test('rejects release metadata whose ID does not match the recommendation link', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ ...releaseResponse, id: 99 }));
  expect(await loadRecommendationRelease(input, fetcher)).toMatchObject({
    ok: false,
    error: { code: 'invalid-response' },
  });
});
