import { expect, test, vi } from 'vitest';
import { createApiFeasibilityPrototype } from './api-feasibility';

test('uses the documented Cosine lookup and headers without exposing session credentials', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ success: true, data: [{ id: '42', artist: 'Hipp-E', track: 'Down On Me' }] }),
    );
  const service = createApiFeasibilityPrototype(fetcher);
  expect(service.configure({ provider: 'cosine', token: 'private-key' })).toEqual({
    ok: true,
    value: { cosine: true, beatport: false, bandcamp: false },
  });
  const result = await service.probe({
    provider: 'cosine',
    operation: 'lookup',
    query: 'https://www.youtube.com/watch?v=J3xwcFQdc2w',
  });
  const [url, options] = fetcher.mock.calls[0] ?? [];
  expect(url).toContain('/api/v1/tracks/lookup?url=');
  expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer private-key');
  expect(new Headers(options?.headers).get('User-Agent')).toContain('AutoDigger');
  expect(options?.redirect).toBe('error');
  expect(result).toMatchObject({
    ok: true,
    value: { items: [{ id: '42', title: 'Down On Me', artist: 'Hipp-E' }] },
  });
  expect(JSON.stringify(result)).not.toContain('private-key');
  expect(fetcher).toHaveBeenCalledTimes(1);
  service.forget();
  expect(service.status()).toMatchObject({ ok: true, value: { cosine: false } });
});

test('retains recommendation versions, unique IDs and YouTube provenance with year filters', async () => {
  const item = {
    id: '84',
    artist: 'Chicken Lips',
    track: 'Many Members (Medicine Remix)',
    video_uri: 'https://www.youtube.com/watch?v=hrBaEnBJ1og',
    external_link: 'https://www.discogs.com/release/85606',
    score: 0.87,
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ success: true, data: { similar_tracks: [item, item] } }));
  const result = await createApiFeasibilityPrototype(fetcher).probe({
    provider: 'cosine',
    operation: 'similar',
    query: '42',
    startYear: 2000,
    endYear: 2003,
  });
  expect(fetcher.mock.calls[0]?.[0]).toContain('start_year=2000&end_year=2003');
  expect(result).toMatchObject({
    ok: true,
    value: {
      items: [
        {
          title: item.track,
          youtubeUrl: item.video_uri,
          sourceUrl: item.external_link,
          score: 0.87,
        },
      ],
    },
  });
  if (result.ok) expect(result.value.items).toHaveLength(1);
});

test.each([401, 403, 429])('reports HTTP %s without returning an echoed key', async (status) => {
  const service = createApiFeasibilityPrototype(
    vi.fn<typeof fetch>().mockResolvedValue(new Response('private-key', { status })),
  );
  service.configure({ provider: 'beatport', token: 'private-key' });
  const result = await service.probe({
    provider: 'beatport',
    operation: 'search',
    query: 'Hipp-E',
  });
  expect(result).toMatchObject({ ok: false, error: { httpStatus: status } });
  expect(JSON.stringify(result)).not.toContain('private-key');
});

test('does not mistake Bandcamp account access for catalogue search', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ bands: [] }));
  const service = createApiFeasibilityPrototype(fetcher);
  const unsupported = await service.probe({
    provider: 'bandcamp',
    operation: 'search',
    query: 'House',
  });
  expect(unsupported).toMatchObject({ ok: false, error: { code: 'unsupported' } });
  expect(fetcher).not.toHaveBeenCalled();
  const account = await service.probe({ provider: 'bandcamp', operation: 'account', query: '' });
  expect(account.ok).toBe(true);
  if (account.ok) expect(account.value.note).toContain('does not prove catalogue');
  expect(fetcher.mock.calls[0]?.[1]?.method).toBe('POST');
});

test('rejects malformed successful responses and reversed year ranges', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ unexpected: [] }));
  const service = createApiFeasibilityPrototype(fetcher);
  expect(
    await service.probe({ provider: 'cosine', operation: 'search', query: 'House' }),
  ).toMatchObject({ ok: false, error: { code: 'invalid-response' } });
  fetcher.mockClear();
  expect(
    await service.probe({
      provider: 'cosine',
      operation: 'similar',
      query: '42',
      startYear: 2003,
      endYear: 2000,
    }),
  ).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
  expect(fetcher).not.toHaveBeenCalled();
});
