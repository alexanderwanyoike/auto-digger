import { expect, test, vi } from 'vitest';
import { createStarterShelf } from './discover';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsBridge } from '../../shared/discogs';
import type { SearchPage } from '../../shared/search';

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

test('skips styles the search cannot accept and preserves a rejected session during starter fill', async () => {
  const rejected = discogsFailure('unauthorized', 'Discogs rejected the saved token.');
  const search = vi.fn<DiscogsBridge['search']>().mockImplementation(({ filters }) => {
    if (!filters.style.length) return Promise.resolve(rejected);
    if (filters.style.join(',') === 'Deep House') return Promise.resolve(catalogue([match]));
    return Promise.resolve(discogsFailure('invalid-input', 'Unsupported style filter.'));
  });
  const shelf = createStarterShelf(
    search,
    () => Promise.resolve({ ok: true, value: new Set<number>() }),
    () =>
      Promise.resolve({
        ok: true,
        value: [
          { style: 'House|Techno', releases: 2 },
          { style: 'Deep House', releases: 1 },
        ],
      }),
  );

  await expect(shelf()).resolves.toEqual(rejected);
});
