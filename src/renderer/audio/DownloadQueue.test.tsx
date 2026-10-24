import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { downloadStage } from '../../shared/downloadJobs';
import type { DownloadJob, DownloadJobsBridge } from '../../shared/downloadJobs';
import { useAudioLibrary } from './useAudioLibrary';
import { DownloadQueue } from './DownloadQueue';

test.each(['downloading', 'failed', 'cancelled'] as const)(
  'keeps every retained %s job accessible for cancellation or retry',
  async (stage) => {
    const jobs: DownloadJob[] = Array.from({ length: 25 }, (_, index) => ({
      ...downloadStage(stage === 'downloading' && index > 0 ? 'queued' : stage),
      id: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
      title: `Track ${(index + 1).toString()}`,
      releaseId: 12,
      videoIndex: index,
      track: null,
      error: stage === 'failed' ? { code: 'unavailable', message: 'This download failed.' } : null,
    }));
    const first = jobs[0];
    if (!first) throw new Error('No jobs');
    const bridge: DownloadJobsBridge = {
      list: () => Promise.resolve({ ok: true, value: jobs }),
      start: () => Promise.resolve({ ok: true, value: [] }),
      cancel: () => Promise.resolve({ ok: true, value: first }),
      retry: () => Promise.resolve({ ok: true, value: first }),
    };
    function Harness() {
      const audio = useAudioLibrary(undefined, bridge);
      return <DownloadQueue audio={audio} />;
    }
    render(<Harness />);
    const action = stage === 'downloading' ? 'Cancel' : 'Retry';
    expect(await screen.findByRole('button', { name: `${action} download Track 1` })).toBeEnabled();
    expect(screen.getByRole('button', { name: `${action} download Track 25` })).toBeEnabled();
  },
);
