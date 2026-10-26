import { expect, test, vi } from 'vitest';
import { createDiscogsSession } from './session';

test('verifies a personal token and exposes only the connected account', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify({ id: 42, username: 'quiet-digger' })));
  const session = createDiscogsSession(request);

  expect(session.account()).toEqual({ ok: true, value: null });
  expect(await session.connect(' personal-token ')).toEqual({
    ok: true,
    value: { id: 42, username: 'quiet-digger' },
  });
  expect(session.account()).toEqual({ ok: true, value: { id: 42, username: 'quiet-digger' } });
  expect(request.mock.calls[0]?.[0]).toBe('https://api.discogs.com/oauth/identity');
  const headers = new Headers(request.mock.calls[0]?.[1]?.headers);
  expect(headers.get('Authorization')).toBe('Discogs token=personal-token');
  expect(headers.get('User-Agent')).toContain('AutoDigger/');
  expect(JSON.stringify(session.account())).not.toContain('personal-token');
});

test.each([
  [401, 'unauthorized'],
  [403, 'unauthorized'],
  [429, 'rate-limited'],
  [404, 'not-found'],
  [503, 'network'],
] as const)('returns a deliberate error for Discogs HTTP %s', async (status, code) => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status }));
  const session = createDiscogsSession(request);
  const result = await session.connect('private-token');
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe(code);
    expect(result.error.message).not.toContain('private-token');
  }
  expect(session.account()).toEqual({ ok: true, value: null });
});

test('rejects an empty token without making a request', async () => {
  const request = vi.fn<typeof fetch>();
  const result = await createDiscogsSession(request).connect('   ');
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('invalid-input');
  expect(request).not.toHaveBeenCalled();
});

test.each(['malformed', 'network', 'json'] as const)(
  'handles %s responses without exposing credentials',
  async (failure) => {
    const request = vi.fn<typeof fetch>();
    if (failure === 'network') request.mockRejectedValue(new Error('private-token'));
    else request.mockResolvedValue(new Response(failure === 'json' ? 'not-json' : '{}'));
    const result = await createDiscogsSession(request).connect('private-token');
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe(failure === 'network' ? 'network' : 'invalid-response');
    expect(JSON.stringify(result)).not.toContain('private-token');
  },
);

test('loads validated release metadata for the connected account without returning the token', async () => {
  const { identityResponse, releaseResponse } = await import('../../../tests/discogs-fixtures');
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify(identityResponse)))
    .mockResolvedValueOnce(new Response(JSON.stringify(releaseResponse)));
  const session = createDiscogsSession(request);
  await session.connect('private-token');

  const result = await session.loadRelease(12);

  expect(result).toEqual({
    ok: true,
    value: {
      id: 12,
      title: 'Quiet Orbit EP',
      artists: ['Low Tide'],
      labels: [{ name: 'Still Records', catalogueNumber: 'ST001' }],
      year: 1998,
      country: 'UK',
      genres: ['Electronic'],
      styles: ['Deep House'],
      formats: ['Vinyl, 12", EP'],
      artworkUrl: 'https://i.discogs.com/example.jpg',
      tracks: [{ position: 'A1', title: 'Quiet Orbit', duration: '6:12' }],
      videos: [
        { title: 'Low Tide - Quiet Orbit', url: 'https://www.youtube.com/watch?v=abcdefghijk' },
      ],
    },
  });
  expect(request.mock.calls[1]?.[0]).toBe('https://api.discogs.com/releases/12');
  expect(new Headers(request.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe(
    'Discogs token=private-token',
  );
  expect(JSON.stringify(result)).not.toContain('private-token');
});

test('allows sparse metadata and ignores unsafe or unsupported media URLs', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: 42, username: 'quiet-digger' })))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 12,
          title: 'Untitled',
          year: 0,
          images: [{ uri: 'https://unknown.example/cover.jpg' }],
          videos: [{ title: 'Other', uri: 'http://www.youtube.com/watch?v=abcdefghijk' }],
        }),
      ),
    );
  const session = createDiscogsSession(request);
  await session.connect('token');
  const result = await session.loadRelease(12);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.year).toBeNull();
    expect(result.value.artworkUrl).toBeNull();
    expect(result.value.videos).toEqual([]);
    expect(result.value.tracks).toEqual([]);
  }
});

test.each([
  new TypeError('connection reset'),
  new DOMException('aborted', 'AbortError'),
  new DOMException('timed out', 'TimeoutError'),
])('classifies a failed response-body read as a network failure', async (failure) => {
  const body = new ReadableStream({
    start(controller) {
      controller.error(failure);
    },
  });
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
  const result = await createDiscogsSession(request).connect('token');
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('network');
});
