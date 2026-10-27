import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { App } from '../App';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import type { AudioBridge } from '../../shared/audio';

test('matches each release search filename independently and lets the user correct ambiguous tracks', async () => {
  const release = {
    ...loadedRelease,
    videos: [],
    tracks: [...loadedRelease.tracks, { position: 'B1', title: 'Night Tide', duration: '5:00' }],
  };
  const matches = ['01 - Quiet Orbit.mp3', '02 - Night Tide.mp3', '03 - Unknown.mp3'].map(
    (filename, index) => ({
      id: (index + 1).toString().repeat(32),
      filename,
      username: 'peer',
      size: 123,
      bitRate: 320,
      length: 300,
      access: 'public' as const,
    }),
  );
  window.soulseek = {
    settings: vi.fn(),
    configure: vi.fn(),
    disconnect: vi.fn(),
    search: () =>
      Promise.resolve({ ok: true, value: { id: 'ep', query: 'Low Tide Quiet Orbit EP' } }),
    results: () =>
      Promise.resolve({ ok: true, value: { complete: true, privateCount: 0, matches } }),
    stop: () => Promise.resolve({ ok: true, value: undefined }),
  };
  const download = vi.fn<AudioBridge['download']>().mockResolvedValue({
    ok: false,
    error: { code: 'network', message: 'Fixture transfer not started' },
  });
  const user = userEvent.setup();
  try {
    render(
      <App
        crate={{
          list: () => Promise.resolve({ ok: true, value: [release] }),
          save: vi.fn(),
          remove: vi.fn(),
        }}
        audioLibrary={{
          list: () => Promise.resolve({ ok: true, value: [] }),
          probe: vi.fn(),
          download,
          reveal: vi.fn(),
        }}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
    await user.click(screen.getByRole('button', { name: 'Soulseek' }));
    await user.click(screen.getByRole('button', { name: 'Search release · Quiet Orbit EP' }));
    const table = within(await screen.findByRole('table', { name: 'Soulseek search results' }));
    expect(
      table.getByRole('combobox', { name: 'Discogs track for 01 - Quiet Orbit.mp3 from peer' }),
    ).toHaveValue('0');
    expect(
      table.getByRole('combobox', { name: 'Discogs track for 02 - Night Tide.mp3 from peer' }),
    ).toHaveValue('1');
    const ambiguous = table.getByRole('combobox', {
      name: 'Discogs track for 03 - Unknown.mp3 from peer',
    });
    expect(ambiguous).toHaveValue('');
    await user.selectOptions(ambiguous, '1');
    await user.click(table.getByRole('button', { name: 'Download 03 - Unknown.mp3 from peer' }));
    expect(download).toHaveBeenCalledWith({
      provider: 'soulseek',
      release,
      candidateId: '3'.repeat(32),
      trackIndex: 1,
    });
  } finally {
    delete window.soulseek;
  }
});
