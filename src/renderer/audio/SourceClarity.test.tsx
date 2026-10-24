import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AudioBridge } from '../../shared/audio';
import type { CrateBridge } from '../../shared/crate';
import { loadedRelease } from '../../../tests/discogsFixtures';
import { App } from '../App';

test('distinguishes the selected Discogs track from the verified YouTube upload title', async () => {
  const bridge: AudioBridge = {
    preview: vi.fn(),
    stopPreview: () => Promise.resolve({ ok: true, value: undefined }),
    list: () => Promise.resolve({ ok: true, value: [] }),
    probe: () =>
      Promise.resolve({
        ok: true,
        value: { videoId: 'abcdefghijk', title: 'Quiet Orbit | vinyl upload by a collector' },
      }),
    download: vi.fn(),
    reveal: vi.fn(),
  };
  const crate: CrateBridge = {
    list: () => Promise.resolve({ ok: true, value: [loadedRelease] }),
    save: vi.fn(),
    remove: vi.fn(),
  };
  const user = userEvent.setup();
  render(<App crate={crate} audioLibrary={bridge} />);
  await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
  const row = within(screen.getByRole('list', { name: 'YouTube audio sources' })).getByRole(
    'listitem',
  );
  expect(await within(row).findByText('Quiet Orbit | vinyl upload by a collector')).toBeVisible();
  expect(within(row).getByText('YouTube video')).toBeVisible();
  expect(within(row).getByLabelText('Discogs track')).toHaveDisplayValue('A1 · Quiet Orbit');
  expect(within(row).getByText('Suggested match')).toBeVisible();
  expect(
    within(row).queryByText('Discogs tags will use this track. You can change the match.'),
  ).not.toBeInTheDocument();
});

test.each([
  { online: true, missing: false },
  { online: false, missing: false },
  { online: true, missing: true },
])(
  'handles saved upload titles and missing-file recovery: online=$online missing=$missing',
  async ({ online, missing }) => {
    const bridge: AudioBridge = {
      preview: vi.fn(),
      stopPreview: () => Promise.resolve({ ok: true, value: undefined }),
      list: () =>
        Promise.resolve({
          ok: true,
          value: [
            {
              id: '12-abcdefghijk',
              videoId: 'abcdefghijk',
              releaseId: 12,
              title: 'Quiet Orbit',
              sourceTitle: 'Original collector upload',
              trackIndex: 0,
              album: 'Quiet Orbit EP',
              artist: 'Low Tide',
              artworkUrl: null,
              filename: 'Quiet Orbit.yt.mp3',
              warning: null,
              missing,
            },
          ],
        }),
      probe: () =>
        Promise.resolve(
          online
            ? { ok: true, value: { videoId: 'abcdefghijk', title: 'Renamed collector upload' } }
            : { ok: false, error: { code: 'network', message: 'Offline' } },
        ),
      download: vi.fn(),
      reveal: vi.fn(),
    };
    const crate: CrateBridge = {
      list: () => Promise.resolve({ ok: true, value: [loadedRelease] }),
      save: vi.fn(),
      remove: vi.fn(),
    };
    const user = userEvent.setup();
    render(<App crate={crate} audioLibrary={bridge} />);
    await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
    const row = within(screen.getByRole('list', { name: 'YouTube audio sources' })).getByRole(
      'listitem',
    );
    expect(
      await within(row).findByText(
        online ? 'Renamed collector upload' : 'Original collector upload',
      ),
    ).toBeVisible();
    expect(within(row).getByLabelText('Discogs track')).toHaveDisplayValue('A1 · Quiet Orbit');
    if (missing) {
      expect(within(row).getByRole('button', { name: 'Download audio' })).toBeEnabled();
      expect(within(row).queryByRole('button', { name: 'Play track' })).not.toBeInTheDocument();
    } else expect(within(row).getByRole('button', { name: 'Play track' })).toBeEnabled();
  },
);
