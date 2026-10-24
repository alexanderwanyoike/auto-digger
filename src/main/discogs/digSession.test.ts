import { expect, test, vi } from 'vitest';
import { createDiscogsSession } from './session';
import { identityResponse, releaseResponse } from '../../../tests/discogsFixtures';

test('requires a session, digs an EP, reports exhaustion and clears history on reconnect', async () => {
  const request = vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = typeof input === 'string' ? input : '';
    if (url.endsWith('/oauth/identity'))
      return Promise.resolve(new Response(JSON.stringify(identityResponse)));
    if (url.includes('/database/search?'))
      return Promise.resolve(
        new Response(
          JSON.stringify({
            pagination: { page: 1, pages: 1, per_page: 50, items: 1 },
            results: [{ id: 12, title: 'Quiet Orbit EP' }],
          }),
        ),
      );
    return Promise.resolve(new Response(JSON.stringify(releaseResponse)));
  });
  const session = createDiscogsSession(request);
  expect(await session.dig({ filters: {} })).toMatchObject({
    ok: false,
    error: { code: 'unauthorized' },
  });
  await session.connect('token');
  expect(await session.dig({ filters: {} })).toMatchObject({
    ok: true,
    value: { seen: 1, total: 1, release: { id: 12 } },
  });
  expect(await session.dig({ filters: {} })).toMatchObject({
    ok: false,
    error: { code: 'exhausted' },
  });
  session.disconnect();
  await session.connect('token');
  expect(await session.dig({ filters: {} })).toMatchObject({
    ok: true,
    value: { seen: 1, release: { id: 12 } },
  });
});
