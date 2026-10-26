import { expect, test, vi } from 'vitest';
import { createDownloadJobs } from './jobs';
import type { AudioResult, LocalTrack } from '../../shared/audio';
import { loadedRelease } from '../../../tests/discogsFixtures';
import { downloadStage } from '../../shared/downloadJobs';

const track: LocalTrack = {
  id: '12-abcdefghijk',
  releaseId: 12,
  videoId: 'abcdefghijk',
  title: 'Quiet Orbit',
  sourceTitle: 'Quiet Orbit',
  trackIndex: 0,
  artist: 'Low Tide',
  album: 'Quiet Orbit EP',
  artworkUrl: null,
  filename: 'Quiet Orbit.yt.mp3',
  warning: null,
};

test('queues Soulseek sources without pretending they are YouTube videos and rejects a duplicate pending source', async () => {
  const execute = vi.fn(() => new Promise<AudioResult<LocalTrack>>(() => undefined));
  const jobs = createDownloadJobs(execute);
  const candidateId = 'a'.repeat(32);
  const input = { provider: 'soulseek', release: loadedRelease, trackIndex: 0, candidateId };
  expect(jobs.start([input])).toMatchObject({
    ok: true,
    value: [{ sourceId: `12-slsk-${candidateId}`, title: 'Quiet Orbit' }],
  });
  expect(jobs.start([input])).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
});

test('queues serially, exposes measured progress, cancels queued/active items and retries only the failed item', async () => {
  const execute = vi.fn(
    (
      _input: unknown,
      options: {
        signal?: AbortSignal;
        onProgress?: (progress: ReturnType<typeof downloadStage>) => void;
      },
    ): Promise<AudioResult<LocalTrack>> => {
      options.onProgress?.({
        ...downloadStage('downloading'),
        percent: 25,
        bytes: 25,
        totalBytes: 100,
      });
      if (execute.mock.calls.length === 1)
        return new Promise((resolve) => {
          options.signal?.addEventListener('abort', () => {
            resolve({ ok: false, error: { code: 'cancelled', message: 'Cancelled' } });
          });
        });
      return Promise.resolve({ ok: true, value: track });
    },
  );
  const jobs = createDownloadJobs(execute);
  const second = { ...loadedRelease, id: 13 };
  const started = jobs.start([
    { release: loadedRelease, videoIndex: 0 },
    { release: second, videoIndex: 0 },
  ]);
  if (!started.ok || !started.value[0] || !started.value[1]) throw new Error('No jobs');
  const [first, next] = started.value;
  expect(execute).toHaveBeenCalledTimes(1);
  expect(jobs.list()).toMatchObject({
    ok: true,
    value: [{ stage: 'downloading', percent: 25 }, { stage: 'queued' }],
  });
  expect(jobs.cancel(next.id)).toMatchObject({ ok: true, value: { stage: 'cancelled' } });
  jobs.cancel(first.id);
  await vi.waitFor(() => {
    expect(jobs.list()).toMatchObject({
      ok: true,
      value: [{ stage: 'cancelled' }, { stage: 'cancelled' }],
    });
  });
  jobs.retry(first.id);
  await vi.waitFor(() => {
    expect(jobs.list()).toMatchObject({
      ok: true,
      value: [{ stage: 'cancelled' }, { stage: 'complete', track }],
    });
  });
  expect(execute).toHaveBeenCalledTimes(2);
  await jobs.close();
});

test('rejects invalid and duplicate pending sources atomically, and stops accepting work after shutdown', async () => {
  const execute = vi.fn(() => Promise.resolve({ ok: true as const, value: track }));
  const jobs = createDownloadJobs(execute);
  const input = { release: loadedRelease, videoIndex: 0 };
  expect(jobs.start([input, input])).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
  expect(jobs.start([{ ...input, videoIndex: 999 }])).toMatchObject({ ok: false });
  expect(jobs.list()).toEqual({ ok: true, value: [] });
  expect(execute).not.toHaveBeenCalled();
  await jobs.close();
  expect(jobs.start([input])).toMatchObject({ ok: false, error: { code: 'unavailable' } });
});

test('does not retry an old job while a newer job targets the same pending source', async () => {
  const jobs = createDownloadJobs(
    (_input, options) =>
      new Promise<AudioResult<LocalTrack>>((resolve) => {
        options.signal?.addEventListener('abort', () => {
          resolve({ ok: false, error: { code: 'cancelled', message: 'Cancelled' } });
        });
      }),
  );
  try {
    const started = jobs.start([
      { release: { ...loadedRelease, id: 99 }, videoIndex: 0 },
      { release: loadedRelease, videoIndex: 0 },
    ]);
    if (!started.ok || !started.value[1]) throw new Error('No queued job');
    const old = started.value[1];
    jobs.cancel(old.id);
    expect(jobs.start([{ release: loadedRelease, videoIndex: 0 }])).toMatchObject({ ok: true });
    expect(jobs.retry(old.id)).toMatchObject({ ok: false, error: { code: 'busy' } });
  } finally {
    await jobs.close();
  }
});

test('lists a retried success after later-created failures for the same source', async () => {
  const execute = vi
    .fn<() => Promise<AudioResult<LocalTrack>>>()
    .mockResolvedValueOnce({ ok: false, error: { code: 'unavailable', message: 'Try again' } })
    .mockResolvedValueOnce({
      ok: false,
      error: { code: 'unavailable', message: 'Still unavailable' },
    })
    .mockResolvedValue({ ok: true, value: track });
  const jobs = createDownloadJobs(execute);
  const input = { release: loadedRelease, videoIndex: 0 };
  try {
    const first = jobs.start([input]);
    if (!first.ok || !first.value[0]) throw new Error('No first job');
    await vi.waitFor(() => {
      expect(jobs.list()).toMatchObject({ ok: true, value: [{ stage: 'failed' }] });
    });
    const second = jobs.start([input]);
    if (!second.ok || !second.value[0]) throw new Error('No second job');
    await vi.waitFor(() => {
      expect(jobs.list()).toMatchObject({
        ok: true,
        value: [{ stage: 'failed' }, { stage: 'failed' }],
      });
    });
    jobs.retry(first.value[0].id);
    await vi.waitFor(() => {
      expect(jobs.list()).toMatchObject({
        ok: true,
        value: [
          { id: second.value[0]?.id, stage: 'failed' },
          { id: first.value[0]?.id, stage: 'complete', track },
        ],
      });
    });
  } finally {
    await jobs.close();
  }
});
