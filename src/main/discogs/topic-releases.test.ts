import { expect, test, vi } from 'vitest';
import { identityResponse } from '../../../tests/discogs-fixtures';
import { createDiscogsSession } from './session';

test('opens an exact label catalogue beyond the Discogs search result cap', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(identityResponse))
    .mockResolvedValueOnce(Response.json({ results: [{ id: 895, title: 'Columbia' }] }))
    .mockResolvedValueOnce(
      Response.json({
        pagination: { page: 201, pages: 3800, per_page: 50, items: 190000 },
        releases: [{ id: 12, title: 'After the Search Cap', artist: 'Test Artist' }],
      }),
    );
  const session = createDiscogsSession(request);
  await session.connect('token');
  const result = await session.search({
    filters: {},
    topic: { kind: 'label', name: 'Columbia' },
    context: 'explore',
    page: 201,
  });
  expect(result).toMatchObject({
    ok: true,
    value: { page: 201, pages: 3800, releases: [{ id: 12 }] },
  });
  expect(request).toHaveBeenLastCalledWith(
    'https://api.discogs.com/labels/895/releases?page=201&per_page=50',
    expect.any(Object),
  );
});

test('lists one pressing for multiple artist credits on the same record', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(identityResponse))
    .mockResolvedValueOnce(Response.json({ results: [{ id: 19, title: 'Aphex Twin' }] }))
    .mockResolvedValueOnce(
      Response.json({
        pagination: { page: 1, pages: 2, per_page: 50, items: 52 },
        releases: [
          { id: 25128, main_release: 27090, type: 'master', title: 'Remixes', role: 'Producer' },
          { id: 25128, main_release: 27090, type: 'master', title: 'Remixes', role: 'Remix' },
        ],
      }),
    );
  const session = createDiscogsSession(request);
  await session.connect('token');
  const result = await session.search({
    filters: {},
    topic: { kind: 'artist', name: 'Aphex Twin' },
    context: 'explore',
    page: 1,
  });
  expect(result).toMatchObject({
    ok: true,
    value: { page: 1, pages: 2, items: 52, releases: [{ id: 27090 }] },
  });
});
