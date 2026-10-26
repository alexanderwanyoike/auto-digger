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
