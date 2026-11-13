import { expect, test, vi } from 'vitest';
import { createStarterShelf } from './discover';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsBridge } from '../../shared/discogs';
import type { SearchPage } from '../../shared/search';
import type { FollowTopic } from '../../shared/following';

const match = {
  id: 12,
  title: 'Quiet Orbit EP',
  year: '1998',
  labels: [],
  formats: [],
  artworkUrl: null,
};

function catalogue(releases: SearchPage['releases']) {
  return {
    ok: true as const,
    value: { page: 1, pages: 1, perPage: 50, items: releases.length, releases },
  };
}

function shelfFor(
  search: DiscogsBridge['search'],
  taste: { style: string; releases: number }[],
  follows: FollowTopic[] = [],
) {
  return createStarterShelf(
    search,
    () => Promise.resolve({ ok: true, value: new Set([99]) }),
    () => Promise.resolve({ ok: true, value: taste }),
    () => Promise.resolve({ ok: true, value: follows }),
  );
}

test('fills from ranked personal styles without mixing unrelated catalogue picks', async () => {
  const search = vi.fn<DiscogsBridge['search']>().mockImplementation(({ filters }) => {
    if (filters.style.join(',') === 'Deep House')
      return Promise.resolve(catalogue([match, { ...match, id: 99 }]));
    if (filters.style.join(',') === 'Progressive House')
      return Promise.resolve(catalogue([{ ...match, id: 13 }, match]));
    return Promise.resolve(catalogue([{ ...match, id: 14 }]));
  });
  const shelf = shelfFor(
    search,
    [
      { style: 'House|Techno', releases: 9 },
      { style: 'Deep House', releases: 5 },
      { style: 'Progressive House', releases: 2 },
    ],
    [{ kind: 'genre', name: 'Jazz' }],
  );
  await expect(shelf()).resolves.toEqual({ ok: true, value: [match, { ...match, id: 13 }] });
  expect(search.mock.calls.map(([{ filters }]) => filters.style)).toEqual([
    ['Deep House'],
    ['Progressive House'],
  ]);
});

test('uses followed catalogues until there are personal styles to learn from', async () => {
  const search = vi.fn<DiscogsBridge['search']>().mockResolvedValue(catalogue([match]));
  const shelf = shelfFor(search, [], [{ kind: 'label', name: 'Hooj Choons' }]);
  await expect(shelf()).resolves.toEqual({ ok: true, value: [match] });
  expect(search).toHaveBeenCalledOnce();
  expect(search.mock.calls[0]?.[0].filters.label).toBe('Hooj Choons');
});

test('uses a specific starter style before the listener saves or follows', async () => {
  const search = vi.fn<DiscogsBridge['search']>().mockResolvedValue(catalogue([match]));
  await expect(shelfFor(search, [])()).resolves.toEqual({ ok: true, value: [match] });
  expect(search.mock.calls[0]?.[0].filters.style).toEqual(['Progressive House']);
});

test('preserves a rejected session when searching the listener’s styles', async () => {
  const rejected = discogsFailure('unauthorized', 'Discogs rejected the saved token.');
  const search = vi.fn<DiscogsBridge['search']>().mockResolvedValue(rejected);
  await expect(shelfFor(search, [{ style: 'Deep House', releases: 1 }])()).resolves.toEqual(
    rejected,
  );
});
