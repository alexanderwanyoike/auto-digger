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
      genre: [' Electronic ', 'Jazz', 'Electronic'],
      style: ['Techno', 'Deep House'],
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
          artworkUrl: null,
        },
      ],
    },
  });
  const target = request.mock.calls[1]?.[0];
  expect(typeof target).toBe('string');
  const url = new URL(typeof target === 'string' ? target : 'https://invalid.example');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    type: 'release',
    format: 'EP',
    per_page: '50',
    page: '2',
    label: 'Still Records',
    artist: 'Low Tide',
    year: '1998',
    genre: 'Electronic|Jazz',
    style: 'Deep House|Techno',
    release_title: 'Quiet Orbit',
  });
});

test.each([
  [
    'https://i.discogs.com/cover.jpg',
    'https://i.discogs.com/thumb.jpg',
    'https://i.discogs.com/cover.jpg',
  ],
  ['', 'https://i.discogs.com/thumb.jpg', 'https://i.discogs.com/thumb.jpg'],
  [
    'https://untrusted.example/cover.jpg',
    'https://i.discogs.com/thumb.jpg',
    'https://i.discogs.com/thumb.jpg',
  ],
  ['http://i.discogs.com/cover.jpg', 'https://untrusted.example/thumb.jpg', null],
])('returns trusted search artwork with a thumbnail fallback', async (cover, thumb, expected) => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify(identityResponse)))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          pagination: { page: 1, pages: 1, per_page: 50, items: 1 },
          results: [{ id: 12, title: 'Quiet Orbit EP', cover_image: cover, thumb }],
        }),
      ),
    );
  const session = createDiscogsSession(request);
  await session.connect('token');
  const result = await session.search({ filters: {}, page: 1 });
  expect(result).toMatchObject({
    ok: true,
    value: { releases: [{ id: 12, artworkUrl: expected }] },
  });
});
