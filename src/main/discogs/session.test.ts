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
