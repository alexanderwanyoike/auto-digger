import { act, renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { AudioResult, LocalTrack } from '../../shared/audio';
import { downloadStage } from '../../shared/download-jobs';
import type { DownloadJob, DownloadJobsBridge } from '../../shared/download-jobs';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { useDownloadJobs } from './use-download-jobs';

test(
  'settles an awaiting download with a typed failure when queue polling loses contact',
  { timeout: 2000 },
  async () => {
    const job: DownloadJob = {
      ...downloadStage('queued'),
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Quiet Orbit',
      releaseId: 12,
      videoIndex: 0,
      track: null,
      error: null,
    };
    let listing: AudioResult<DownloadJob[]> = { ok: true, value: [] };
    const bridge: DownloadJobsBridge = {
      list: () => Promise.resolve(listing),
      start: () => Promise.resolve({ ok: true, value: [job] }),
      cancel: () => Promise.resolve({ ok: true, value: job }),
      retry: () => Promise.resolve({ ok: true, value: job }),
    };
    const { result } = renderHook(() => useDownloadJobs(bridge));
    let request: Promise<AudioResult<LocalTrack>> | undefined;
    await act(async () => {
      request = result.current.download({ release: loadedRelease, videoIndex: 0 });
      await Promise.resolve();
    });
    listing = {
      ok: false,
      error: { code: 'unavailable', message: 'The queue connection was lost.' },
    };
    if (!request) throw new Error('No pending request');
    const pending = request;
    await act(async () => {
      expect(await pending).toMatchObject({ ok: false, error: { code: 'unavailable' } });
    });
  },
);
