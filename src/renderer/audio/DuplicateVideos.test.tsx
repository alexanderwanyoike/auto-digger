import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AudioBridge } from '../../shared/audio';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { App } from '../App';

test('shows and probes each video ID once while keeping distinct uploads and original download indexes', async () => {
  const release = {
    ...loadedRelease,
    videos: [
      { title: 'Low Tide Quiet Orbit', url: 'https://www.youtube.com/watch?v=abcdefghijk' },
      { title: 'Duplicate title variant', url: 'https://youtu.be/abcdefghijk?t=30' },
      { title: 'Low Tide Quiet Orbit', url: 'https://www.youtube.com/watch?v=lmnopqrstuv' },
    ],
  };
  const probe = vi.fn<AudioBridge['probe']>().mockImplementation((url) =>
    Promise.resolve({
      ok: true,
      value: {
        videoId: url.includes('lmnopqrstuv') ? 'lmnopqrstuv' : 'abcdefghijk',
        title: 'Low Tide Quiet Orbit',
      },
    }),
  );
  const download = vi.fn<AudioBridge['download']>().mockResolvedValue({
    ok: false,
    error: { code: 'storage', message: 'Download fixture stopped' },
  });
  const user = userEvent.setup();
  render(
    <App
      crate={{
        list: () => Promise.resolve({ ok: true, value: [release] }),
        save: vi.fn(),
        remove: vi.fn(),
      }}
      audioLibrary={{
        list: () => Promise.resolve({ ok: true, value: [] }),
        probe,
        download,
        reveal: vi.fn(),
      }}
    />,
  );
  await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
  const list = screen.getByRole('list', { name: 'YouTube audio sources' });
  const summary = list.querySelector('summary');
  if (summary) await user.click(summary);
  const rows = Array.from(list.querySelectorAll<HTMLLIElement>('li.audio-source'));
  expect(rows).toHaveLength(2);
  const second = rows[1];
  if (!second) throw new Error('Expected alternate upload');
  await user.click(await within(second).findByRole('button', { name: 'Download audio' }));
  expect(probe).toHaveBeenCalledTimes(2);
  expect(download).toHaveBeenCalledWith({ release, videoIndex: 2, trackIndex: 0 });
});
