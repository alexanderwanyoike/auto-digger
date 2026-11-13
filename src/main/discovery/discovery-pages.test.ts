import { expect, test, vi } from 'vitest';
import type { DiscogsBridge } from '../../shared/discogs';
import { discogsFailure } from '../../shared/discogs-failure';
import type { FollowTopic } from '../../shared/following';
import { createDiscoveryPages } from './discovery-pages';

test('continues through every followed catalogue without exhausting the largest first', async () => {
  const load = createDiscoveryPages(
    ({ filters, page }) => {
      const first = filters.label === 'First label';
      return Promise.resolve({
        ok: true,
        value: {
          page,
          pages: first ? 3 : 1,
          perPage: 50,
          items: first ? 3 : 1,
          releases: [
            {
              id: first ? page : 10,
              title: filters.label,
              year: '',
              labels: [],
              formats: [],
              artworkUrl: null,
            },
          ],
        },
      });
    },
    () => Promise.resolve({ ok: true, value: [] }),
    () =>
      Promise.resolve({
        ok: true,
        value: [
          { kind: 'label', name: 'First label' },
          { kind: 'label', name: 'Second label' },
        ],
      }),
    () => Promise.resolve({ ok: true, value: new Set([2]) }),
  );

  const first = await load({ shelf: 'follows', cursor: null });
  if (!first.ok) throw new Error(first.error.message);
  expect(first.value.releases.map(({ id }) => id)).toEqual([1]);
  const second = await load({ shelf: 'follows', cursor: first.value.next });
  if (!second.ok) throw new Error(second.error.message);
  expect(second.value.releases.map(({ id }) => id)).toEqual([10]);
  const third = await load({ shelf: 'follows', cursor: second.value.next });
  if (!third.ok) throw new Error(third.error.message);
  expect(third.value.releases).toEqual([]);
  const last = await load({ shelf: 'follows', cursor: third.value.next });
  expect(last).toMatchObject({ ok: true, value: { releases: [{ id: 3 }], next: null } });
});

test('stops at the supported Discogs page limit', async () => {
  const load = createDiscoveryPages(
    ({ page }) =>
      Promise.resolve({
        ok: true,
        value: { page, pages: 400, perPage: 25, items: 5000, releases: [] },
      }),
    () => Promise.resolve({ ok: true, value: [{ style: 'Techno', releases: 1 }] }),
    () => Promise.resolve({ ok: true, value: [] }),
    () => Promise.resolve({ ok: true, value: new Set<number>() }),
  );

  const first = await load({ shelf: 'starter', cursor: null });
  if (!first.ok || !first.value.next) throw new Error('Expected another page');
  const last = await load({ shelf: 'starter', cursor: { ...first.value.next, page: 200 } });
  expect(last).toEqual({ ok: true, value: { releases: [], next: null } });
});

test('continues a broad style through narrower Discogs searches', async () => {
  const load = createDiscoveryPages(
    ({ filters, page }) =>
      Promise.resolve({
        ok: true,
        value: {
          page,
          pages: filters.year ? 1 : 200,
          perPage: 50,
          items: filters.year ? 1 : 10001,
          releases: [
            {
              id: filters.year ? 20 : 10,
              title: filters.style.join(', '),
              year: '1999',
              labels: [],
              formats: [],
              artworkUrl: null,
            },
          ],
        },
      }),
    () => Promise.resolve({ ok: true, value: [{ style: 'Techno', releases: 1 }] }),
    () => Promise.resolve({ ok: true, value: [] }),
    () => Promise.resolve({ ok: true, value: new Set<number>() }),
  );

  const first = await load({ shelf: 'starter', cursor: null });
  if (!first.ok || !first.value.next) throw new Error('Expected another page');
  const next = await load({ shelf: 'starter', cursor: first.value.next });
  expect(next).toMatchObject({ ok: true, value: { releases: [{ id: 20 }] } });
});

test('continues past an unavailable followed catalogue and skips newly unfollowed sources', async () => {
  const gone = discogsFailure('not-found', 'Catalogue not found');
  const search = vi.fn<DiscogsBridge['search']>().mockImplementation(({ filters, page }) => {
    if (filters.label === 'Missing') return Promise.resolve(gone);
    return Promise.resolve({
      ok: true,
      value: {
        page,
        pages: 2,
        perPage: 50,
        items: 2,
        releases: [
          {
            id: filters.label === 'Healthy' ? 20 + page : 30 + page,
            title: filters.label,
            year: '',
            labels: [],
            formats: [],
            artworkUrl: null,
          },
        ],
      },
    });
  });
  const follows: FollowTopic[] = [
    { kind: 'label', name: 'Missing' },
    { kind: 'label', name: 'Unfollowed' },
    { kind: 'label', name: 'Healthy' },
  ];
  const load = createDiscoveryPages(
    search,
    () => Promise.resolve({ ok: true, value: [] }),
    () => Promise.resolve({ ok: true, value: follows }),
    () => Promise.resolve({ ok: true, value: new Set<number>() }),
  );

  const first = await load({ shelf: 'follows', cursor: null });
  if (!first.ok || !first.value.next) throw new Error('Expected another followed source');
  expect(first.value.releases).toEqual([]);
  follows.splice(1, 1);
  const second = await load({ shelf: 'follows', cursor: first.value.next });
  if (!second.ok || !second.value.next) throw new Error('Expected the healthy source');
  expect(second.value.releases).toEqual([]);
  await expect(load({ shelf: 'follows', cursor: second.value.next })).resolves.toMatchObject({
    ok: true,
    value: { releases: [{ id: 21 }] },
  });
  expect(search.mock.calls.map(([{ filters }]) => filters.label)).toEqual(['Missing', 'Healthy']);
});
