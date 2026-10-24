import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AudioBridge } from '../../shared/audio';
import type { CrateBridge } from '../../shared/crate';
import { loadedRelease } from '../../../tests/discogsFixtures';
import { App } from '../App';

test('previews through the shared transport without saving, then stops the temporary session', async () => {
  const media = new Audio();
  function TestAudio() {
    return media;
  }
  vi.stubGlobal('Audio', TestAudio);
  const preview = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      value: {
        id: 'temporary-preview',
        title: 'Quiet Orbit',
        artist: 'Low Tide',
        album: 'Quiet Orbit EP',
        artworkUrl: null,
        source: 'preview',
        url: 'auto-digger-audio://preview/temporary-preview',
      },
    });
  const stopPreview = vi.fn().mockResolvedValue({ ok: true, value: undefined });
  const bridge: AudioBridge = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    probe: () =>
      Promise.resolve({
        ok: true,
        value: { videoId: 'abcdefghijk', title: 'Low Tide - Quiet Orbit' },
      }),
    download: vi.fn(),
    reveal: vi.fn(),
    preview,
    stopPreview,
  };
  const crate: CrateBridge = {
    list: () => Promise.resolve({ ok: true, value: [loadedRelease] }),
    save: vi.fn(),
    remove: vi.fn(),
  };
  const user = userEvent.setup();
  render(<App crate={crate} audioLibrary={bridge} />);
  await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
  await user.click(await screen.findByRole('button', { name: 'Preview' }));
  expect(preview).toHaveBeenCalledWith({ release: loadedRelease, videoIndex: 0, trackIndex: 0 });
  expect(bridge.download).not.toHaveBeenCalled();
  expect(media.src).toBe('auto-digger-audio://preview/temporary-preview');
  fireEvent.canPlay(media);
  fireEvent.play(media);
  const player = screen.getByRole('contentinfo', { name: 'Playback' });
  expect(within(player).getByText(/Preview · Low Tide/)).toBeVisible();
  await user.click(within(player).getByRole('button', { name: 'Stop preview' }));
  expect(stopPreview).toHaveBeenCalled();
  expect(within(player).getByText('Nothing on the deck')).toBeVisible();
});
