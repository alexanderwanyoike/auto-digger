import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AudioBridge } from '../../shared/audio';
import type { CrateBridge } from '../../shared/crate';
import type { DownloadJob, DownloadJobsBridge } from '../../shared/download-jobs';
import { downloadStage } from '../../shared/download-jobs';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { App } from '../App';

test('keeps download progress inside the original source button without inserting a queue', async () => {
  let jobs: DownloadJob[] = [];
  const active: DownloadJob = {
    ...downloadStage('downloading'),
    id: '00000000-0000-4000-8000-000000000001',
    releaseId: loadedRelease.id,
    videoIndex: 0,
    title: 'Quiet Orbit',
    percent: 42,
    track: null,
    error: null,
  };
  const queue: DownloadJobsBridge = {
    list: () => Promise.resolve({ ok: true, value: jobs }),
    start: () => {
      jobs = [active];
      return Promise.resolve({ ok: true, value: jobs });
    },
    cancel: vi.fn(),
    retry: vi.fn(),
  };
  const audio: AudioBridge = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    probe: () =>
      Promise.resolve({ ok: true, value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' } }),
    download: vi.fn(),
    reveal: vi.fn(),
  };
  const crate: CrateBridge = {
    list: () => Promise.resolve({ ok: true, value: [loadedRelease] }),
    save: vi.fn(),
    remove: vi.fn(),
  };
  window.downloadJobs = queue;
  try {
    const user = userEvent.setup();
    const view = render(<App crate={crate} audioLibrary={audio} />);
    await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
    const control = await screen.findByRole('button', { name: 'Download audio' });
    await user.click(control);
    expect(await within(control).findByText('42%')).toBeVisible();
    expect(control).toHaveAttribute('aria-busy', 'true');
    expect(
      within(control).getByRole('progressbar', { name: 'Progress for Quiet Orbit' }),
    ).toHaveAttribute('aria-valuenow', '42');
    expect(screen.queryByRole('region', { name: 'Download queue' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel download Quiet Orbit' })).toBe(control);
    view.unmount();
  } finally {
    delete window.downloadJobs;
  }
});

test('can queue a YouTube source while a Soulseek request is waiting for a peer', async () => {
  let jobs: DownloadJob[] = [];
  const start = vi.fn<DownloadJobsBridge['start']>().mockImplementation((inputs) => {
    const input = inputs[0];
    if (!input) throw new Error('Expected a source');
    const soulseek = 'provider' in input;
    const job: DownloadJob = {
      ...downloadStage(soulseek ? 'waiting' : 'queued'),
      id: `00000000-0000-4000-8000-${(jobs.length + 1).toString().padStart(12, '0')}`,
      releaseId: 12,
      title: 'Quiet Orbit',
      ...(soulseek
        ? { sourceId: `12-slsk-${'a'.repeat(32)}` }
        : { videoIndex: 0, sourceId: '12-abcdefghijk' }),
      track: null,
      error: null,
    };
    jobs = [...jobs, job];
    return Promise.resolve({ ok: true, value: [job] });
  });
  window.downloadJobs = {
    list: () => Promise.resolve({ ok: true, value: jobs }),
    start,
    cancel: vi.fn(),
    retry: vi.fn(),
  };
  window.soulseek = {
    settings: vi.fn(),
    configure: vi.fn(),
    disconnect: vi.fn(),
    search: () => Promise.resolve({ ok: true, value: { id: 'search', query: 'Quiet Orbit' } }),
    results: () =>
      Promise.resolve({
        ok: true,
        value: {
          complete: true,
          privateCount: 0,
          matches: [
            {
              id: 'a'.repeat(32),
              username: 'peer',
              filename: 'Quiet Orbit.flac',
              size: 100,
              bitRate: null,
              length: 60,
              access: 'public',
            },
          ],
        },
      }),
    stop: () => Promise.resolve({ ok: true, value: undefined }),
  };
  const user = userEvent.setup();
  try {
    const view = render(
      <App
        crate={{
          list: () => Promise.resolve({ ok: true, value: [loadedRelease] }),
          save: vi.fn(),
          remove: vi.fn(),
        }}
        audioLibrary={{
          list: () => Promise.resolve({ ok: true, value: [] }),
          probe: () =>
            Promise.resolve({ ok: true, value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' } }),
          download: vi.fn(),
          reveal: vi.fn(),
        }}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
    await user.click(screen.getByRole('button', { name: 'Soulseek' }));
    await user.click(screen.getByRole('button', { name: 'Search A1 · Quiet Orbit' }));
    await user.click(
      await screen.findByRole('button', { name: 'Download Quiet Orbit.flac from peer' }),
    );
    await user.click(screen.getByRole('button', { name: 'YouTube' }));
    const youtube = await screen.findByRole('button', { name: 'Download audio' });
    expect(youtube).toBeEnabled();
    await user.click(youtube);
    expect(start).toHaveBeenCalledTimes(2);
    expect(start.mock.calls[1]?.[0]).toMatchObject([{ videoIndex: 0, release: loadedRelease }]);
    view.unmount();
  } finally {
    delete window.downloadJobs;
    delete window.soulseek;
  }
});
