import { expect, test, vi } from 'vitest';
import { createDigger } from './digger';
import { loadedRelease } from '../../../tests/discogsFixtures';
import type { DiscogsResult, DiscogsRelease } from '../../shared/discogs';
import type { DigFilters, SearchPage } from '../../shared/search';

type Search = (criteria: DigFilters, page: number) => Promise<DiscogsResult<SearchPage>>;
type Load = (id: number) => Promise<DiscogsResult<DiscogsRelease>>;

const filters: DigFilters = {
  label: '',
  artist: '',
  year: '',
  genre: [],
  style: ['Deep House'],
  format: [],
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

test.each([
  { formats: ['Album'] },
  { formats: ['Compilation'] },
  { formats: ['Vinyl'] },
  { formats: [] },
])(
  'random digging accepts release formats $formats without an EP restriction',
  async ({ formats }) => {
    const release = { ...loadedRelease, formats };
    const search = vi.fn<Search>().mockResolvedValue({
      ok: true,
      value: {
        page: 1,
        pages: 1,
        perPage: 50,
        items: 1,
        releases: [{ ...release, year: '1998', labels: ['Still Records'] }],
      },
    });
    const load = vi.fn<Load>().mockResolvedValue({ ok: true, value: release });
    const digger = createDigger(search, load);
    expect(await digger.next(filters)).toMatchObject({
      ok: true,
      value: { release: { formats }, seen: 1 },
    });
  },
);

test('random digging accepts any selected type and skips stale nonmatching releases', async () => {
  const search = vi.fn<Search>().mockResolvedValue({
    ok: true,
    value: {
      page: 1,
      pages: 1,
      perPage: 50,
      items: 3,
      releases: [12, 13, 14].map((id) => ({
        id,
        title: 'Candidate',
        year: '',
        labels: [],
        formats: [],
        artworkUrl: null,
      })),
    },
  });
  const formatsById: Record<number, string> = {
    12: 'Vinyl, Single',
    13: 'CD, Compilation',
    14: 'Vinyl, Album',
  };
  const load = vi.fn<Load>().mockImplementation((id) =>
    Promise.resolve({
      ok: true,
      value: {
        ...loadedRelease,
        id,
        formats: [formatsById[id] ?? ''],
      },
    }),
  );
  const digger = createDigger(search, load, () => 0);
  const criteria = { ...filters, format: ['Album', 'Compilation'] };
  expect(await digger.next(criteria)).toMatchObject({ ok: true, value: { release: { id: 14 } } });
  expect(await digger.next(criteria)).toMatchObject({ ok: true, value: { release: { id: 13 } } });
  expect(await digger.next(criteria)).toMatchObject({ ok: false, error: { code: 'exhausted' } });
  expect(search).toHaveBeenCalledWith(criteria, 1);
});
