import { expect, test, vi } from 'vitest';
import { createDiscogsSession } from './session';
import { identityResponse } from '../../../tests/discogsFixtures';

test('combines Discogs filters into an authenticated paged EP search', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify(identityResponse)))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          pagination: { page: 2, pages: 3, per_page: 50, items: 111 },
          results: [
            {
              id: 12,
              title: 'Low Tide - Quiet Orbit EP',
              year: '1998',
              label: ['Still Records'],
              format: ['Vinyl', 'EP'],
            },
          ],
        }),
      ),
    );
  const session = createDiscogsSession(request);
  await session.connect('token');
  const result = await session.search({
    filters: {
      label: ' Still Records ',
      artist: 'Low Tide',
      year: '1998',
      genre: 'Electronic',
      style: 'Deep House',
      title: 'Quiet Orbit',
    },
    page: 2,
  });
  expect(result).toEqual({
    ok: true,
    value: {
      page: 2,
      pages: 3,
      perPage: 50,
      items: 111,
      releases: [
        {
          id: 12,
          title: 'Low Tide - Quiet Orbit EP',
          year: '1998',
          labels: ['Still Records'],
          formats: ['Vinyl', 'EP'],
        },
      ],
    },
  });
  const url = new URL(String(request.mock.calls[1]?.[0]));
  expect(Object.fromEntries(url.searchParams)).toEqual({
    type: 'release',
    format: 'EP',
    per_page: '50',
    page: '2',
    label: 'Still Records',
    artist: 'Low Tide',
    year: '1998',
    genre: 'Electronic',
    style: 'Deep House',
    release_title: 'Quiet Orbit',
  });
});
