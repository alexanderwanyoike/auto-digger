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
