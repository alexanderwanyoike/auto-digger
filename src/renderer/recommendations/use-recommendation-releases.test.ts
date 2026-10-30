import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import type {
  CosineBridge,
  CosineResult,
  Recommendations,
  ResolvedRecommendation,
} from '../../shared/cosine';
import { useRecommendationReleases } from './use-recommendation-releases';

const item = {
  id: '2',
  artist: 'Low Tide',
  title: 'Quiet Orbit',
  releaseId: 12,
  youtubeUrl: 'https://youtu.be/abcdefghijk',
};
const data: Recommendations = {
  seed: { ...item, id: '1' },
  tracks: [item, { ...item, id: '3' }, { ...item, id: '4', releaseId: 13 }],
};
const resolved: CosineResult<ResolvedRecommendation> = {
  ok: true,
  value: {
    release: { ...loadedRelease, artworkUrl: 'https://i.discogs.com/quiet.jpg' },
    trackIndex: 0,
    videoIndex: 0,
  },
};
function bridge(resolve: CosineBridge['resolve']): CosineBridge {
  return { resolve, status: vi.fn(), saveKey: vi.fn(), forget: vi.fn(), similar: vi.fn() };
}

test('loads one cover per linked release in sequence and shares in-flight metadata with preview', async () => {
  let finish: (value: CosineResult<ResolvedRecommendation>) => void = () => undefined;
  const resolve = vi
    .fn<CosineBridge['resolve']>()
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done;
        }),
    )
    .mockResolvedValue({
      ok: false,
      error: { code: 'unavailable', message: 'Metadata unavailable' },
    });
  const api = bridge(resolve);
  const { result } = renderHook(() => useRecommendationReleases(api, data));
  expect(resolve).toHaveBeenCalledTimes(1);
  const preview = result.current.read(item);
  expect(resolve).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(resolved);
    await preview;
  });
  await waitFor(() => {
    expect(result.current.covers[12]?.url).toBe('https://i.discogs.com/quiet.jpg');
  });
  expect(resolve).toHaveBeenCalledTimes(2);
  expect(resolve).toHaveBeenLastCalledWith(data.tracks[2]);
  expect(result.current.covers[13]).toBeUndefined();
  expect(await result.current.read(item)).toEqual(resolved);
  expect(resolve).toHaveBeenCalledTimes(2);
});

test('ignores late cover metadata and stops the queue when the recommendation journey is cleared', async () => {
  let finish: (value: CosineResult<ResolvedRecommendation>) => void = () => undefined;
  const resolve = vi.fn<CosineBridge['resolve']>().mockImplementation(
    () =>
      new Promise((done) => {
        finish = done;
      }),
  );
  const api = bridge(resolve);
  const { result } = renderHook(() => useRecommendationReleases(api, data));
  const pending = result.current.read(item);
  act(() => {
    result.current.clear();
  });
  await act(async () => {
    finish(resolved);
    await pending;
  });
  expect(result.current.covers).toEqual({});
  expect(resolve).toHaveBeenCalledTimes(1);
});

test('a failed background cover lookup allows an explicit open or preview to retry', async () => {
  const resolve = vi
    .fn<CosineBridge['resolve']>()
    .mockResolvedValueOnce({
      ok: false,
      error: { code: 'unavailable', message: 'Metadata unavailable' },
    })
    .mockResolvedValue(resolved);
  const api = bridge(resolve);
  const { result } = renderHook(() => useRecommendationReleases(api, { ...data, tracks: [item] }));
  await act(async () => {
    await Promise.resolve();
  });
  expect(result.current.covers).toEqual({});
  await act(async () => {
    expect(await result.current.read(item)).toEqual(resolved);
  });
  expect(result.current.covers[12]?.url).toBe('https://i.discogs.com/quiet.jpg');
  expect(resolve).toHaveBeenCalledTimes(2);
});
