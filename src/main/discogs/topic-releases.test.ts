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
