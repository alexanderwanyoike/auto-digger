import { expect, test, vi } from 'vitest';
import { identityResponse, releaseResponse } from '../../../tests/discogs-fixtures';
import { createDiscogsSession } from './session';

test('uses the remaining budget for an explicit release rather than a portrait', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json(identityResponse, {
        headers: { 'X-Discogs-Ratelimit-Remaining': '1' },
      }),
    )
    .mockResolvedValueOnce(Response.json(releaseResponse));
  const session = createDiscogsSession(request);
  await session.connect('fixture-token');

  const portrait = await session.topicArtwork({ kind: 'label', name: 'Still Records' });
  expect(portrait).toMatchObject({ ok: false, error: { code: 'rate-limited' } });
  if (portrait.ok) throw new Error('The portrait should wait for quota');
  expect(typeof portrait.error.retryAt).toBe('number');
  await expect(session.loadRelease(12)).resolves.toMatchObject({ ok: true });
  expect(request.mock.calls.map(([url]) => url)).toEqual([
    'https://api.discogs.com/oauth/identity',
    'https://api.discogs.com/releases/12',
  ]);
});

test('pauses Discogs calls after a 429 and resumes once Retry-After expires', async () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(120_000);
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(identityResponse))
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'Retry-After': '3' } }))
      .mockResolvedValueOnce(Response.json(releaseResponse));
    const session = createDiscogsSession(request);
    await session.connect('fixture-token');

    const paused = { ok: false, error: { code: 'rate-limited', retryAt: 123_000 } };
    await expect(session.loadRelease(12)).resolves.toMatchObject(paused);
    await expect(session.search({ filters: {}, page: 1 })).resolves.toMatchObject(paused);
    expect(request).toHaveBeenCalledTimes(2);
    vi.setSystemTime(123_000);
    await expect(session.loadRelease(12)).resolves.toMatchObject({ ok: true });
    expect(request).toHaveBeenCalledTimes(3);
  } finally {
    vi.useRealTimers();
  }
});

test('shares concurrent and recent release reads until the account changes', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(identityResponse))
    .mockResolvedValueOnce(Response.json(releaseResponse))
    .mockResolvedValueOnce(Response.json({ ...identityResponse, id: 43 }))
    .mockResolvedValueOnce(Response.json({ ...releaseResponse, title: 'Second account result' }));
  const session = createDiscogsSession(request);
  await session.connect('fixture-token');

  const concurrent = await Promise.all([session.loadRelease(12), session.loadRelease(12)]);
  expect(concurrent).toMatchObject([{ ok: true }, { ok: true }]);
  expect(await session.loadRelease(12)).toEqual(concurrent[0]);
  expect(request).toHaveBeenCalledTimes(2);
  await session.connect('other-token');
  await expect(session.loadRelease(12)).resolves.toMatchObject({
    ok: true,
    value: { title: 'Second account result' },
  });
  expect(request).toHaveBeenCalledTimes(4);
});
