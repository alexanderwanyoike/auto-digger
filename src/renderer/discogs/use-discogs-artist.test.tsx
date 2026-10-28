import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { identityResponse, loadedRelease } from '../../../tests/discogs-fixtures';
import type { DiscogsBridge } from '../../shared/discogs';
import { emptyFilters } from '../../shared/default-filters';
import { useDiscogs } from './use-discogs';

test('keeps the original EP return point through deeper artist browsing and scopes artist operations', async () => {
  const matches = { page: 1, pages: 2, perPage: 50, items: 2, releases: [] };
  const search = vi.fn<DiscogsBridge['search']>().mockResolvedValue({ ok: true, value: matches });
  const dig = vi.fn<DiscogsBridge['dig']>().mockResolvedValue({
    ok: true,
    value: { release: loadedRelease, seen: 1, total: 2, limited: false },
  });
  const bridge: DiscogsBridge = {
    account: () => Promise.resolve({ ok: true, value: identityResponse }),
    search,
    dig,
    loadRelease: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    openSettings: vi.fn(),
  };
  const { result } = renderHook(() => useDiscogs(bridge));
  await waitFor(() => {
    expect(result.current.busy).toBe(false);
  });
  const original = { ...emptyFilters, year: '1998', label: 'Still Records' };
  await act(async () => {
    await result.current.search(original);
  });
  await act(async () => {
    await result.current.dig();
  });
  await act(async () => {
    await result.current.browseArtist('Low Tide');
  });
  const artistFilters = { ...emptyFilters, artist: 'Low Tide' };
  await act(async () => {
    await result.current.search(artistFilters, 2);
  });
  await act(async () => {
    await result.current.dig();
  });
  act(() => {
    result.current.openSavedRelease({
      ...loadedRelease,
      id: 13,
      title: 'Later EP',
      artists: ['Still Waters'],
    });
  });
  await act(async () => {
    await result.current.browseArtist('Still Waters');
  });
  expect(result.current.artistBrowse?.origin.release.id).toBe(12);
  expect(search).toHaveBeenNthCalledWith(2, { filters: artistFilters, page: 1, context: 'artist' });
  expect(search).toHaveBeenNthCalledWith(3, { filters: artistFilters, page: 2, context: 'artist' });
  expect(dig).toHaveBeenLastCalledWith({ filters: artistFilters, reset: false, context: 'artist' });

  act(() => {
    result.current.returnFromArtist();
  });
  expect(result.current.release?.id).toBe(12);
  expect(result.current.filters).toEqual(original);
  expect(result.current.matches).toEqual(matches);
  expect(result.current.digging?.seen).toBe(1);
  await act(async () => {
    await result.current.dig();
  });
  expect(dig).toHaveBeenLastCalledWith({ filters: original, reset: false });
});
