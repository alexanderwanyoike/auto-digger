import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AudioBridge } from '../../shared/audio';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { App } from '../App';

test('shows one source per track and reveals alternate and unmatched uploads on demand', async () => {
  const titles = [
    'Low Tide Quiet Orbit',
    'Quiet Orbit - alternate upload',
    'Low Tide Evening Mix',
    'Unidentified recording',
  ];
  const release = {
    ...loadedRelease,
    tracks: [...loadedRelease.tracks, { position: 'B1', title: 'Evening Mix', duration: '5:00' }],
    videos: titles.map((title, index) => ({
      title,
      url: `https://www.youtube.com/watch?v=example000${index.toString()}`,
    })),
  };
  const probe = vi
    .fn<AudioBridge['probe']>()
    .mockImplementation((url) =>
      Promise.resolve({
        ok: true,
        value: {
          videoId: new URL(url).searchParams.get('v') ?? '',
          title: titles[Number(url.at(-1))] ?? '',
        },
      }),
    );
  const download = vi
    .fn<AudioBridge['download']>()
    .mockResolvedValue({
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
  expect(within(list).getAllByLabelText('Discogs track')).toHaveLength(2);
  expect(within(list).queryByText('Quiet Orbit - alternate upload')).toBeNull();
  await user.click(within(list).getByText('1 alternate upload'));
  const alternative = await within(list).findByText('Quiet Orbit - alternate upload');
  const row = alternative.closest('li');
  if (!row) throw new Error('Missing alternate source row');
  await user.click(await within(row).findByRole('button', { name: 'Download audio' }));
  expect(download).toHaveBeenCalledWith({ release, videoIndex: 1, trackIndex: 0 });
  await user.click(within(list).getByText('1 unmatched upload'));
  expect(await within(list).findByText('Unidentified recording')).toBeVisible();
});
