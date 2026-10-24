import { expect, test, vi } from 'vitest';
import { createDigger } from './digger';
import { loadedRelease } from '../../../tests/discogsFixtures';
import type { DiscogsResult, DiscogsRelease } from '../../shared/discogs';
import type { DigFilters, SearchPage } from '../../shared/search';

const filters: DigFilters = {
  label: '',
  artist: '',
  year: '',
  genre: [],
  style: ['Deep House'],
  title: '',
};
test('draws without repetition across a partially filled final page and resets explicitly', async () => {
  const search = vi
    .fn<(criteria: DigFilters, page: number) => Promise<DiscogsResult<SearchPage>>>()
    .mockImplementation((_criteria, page) =>
      Promise.resolve({
        ok: true,
        value: {
          page,
          pages: 2,
          perPage: 2,
          items: 3,
          releases: (page === 1 ? [12, 13] : [14]).map((id) => ({
            id,
            title: 'EP',
            year: '',
            labels: [],
            formats: ['EP'],
            artworkUrl: null,
          })),
        },
      }),
    );
  const load = vi
    .fn<(id: number) => Promise<DiscogsResult<DiscogsRelease>>>()
    .mockImplementation((id) => Promise.resolve({ ok: true, value: { ...loadedRelease, id } }));
  const digger = createDigger(search, load, () => 0.99);
  const results = [
    await digger.next(filters),
    await digger.next(filters),
    await digger.next(filters),
  ];
  expect(results.map((result) => (result.ok ? result.value.release.id : null))).toEqual([
    14, 13, 12,
  ]);
  expect(search).toHaveBeenCalledTimes(2);
  expect(await digger.next(filters)).toMatchObject({ ok: false, error: { code: 'exhausted' } });
  expect(await digger.next(filters, true)).toMatchObject({
    ok: true,
    value: { seen: 1, release: { id: 14 } },
  });
});
