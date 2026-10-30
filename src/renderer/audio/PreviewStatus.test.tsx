import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AudioBridge, AudioResult, LocalTrack } from '../../shared/audio';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { App } from '../App';

test('shows preparation and cancellation in the app footer without expanding the player', async () => {
  let finish: (result: AudioResult<LocalTrack>) => void = () => undefined;
  const pending = new Promise<AudioResult<LocalTrack>>((resolve) => {
    finish = resolve;
  });
  const cancel = vi.fn(() => {
    finish({ ok: false, error: { code: 'cancelled', message: 'Cancelled' } });
    return Promise.resolve({ ok: true as const, value: undefined });
  });
  Reflect.set(window, 'audioPreviews', { prepare: () => pending, cancel });
  const audio: AudioBridge = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    probe: () =>
      Promise.resolve({ ok: true, value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' } }),
    download: vi.fn(),
    reveal: vi.fn(),
  };
  try {
    const user = userEvent.setup();
    render(
      <App
        audioLibrary={audio}
        crate={{
          list: () => Promise.resolve({ ok: true, value: [loadedRelease] }),
          save: vi.fn(),
          remove: vi.fn(),
        }}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
    await user.click(await screen.findByRole('button', { name: 'Preview audio' }));
    const footer = screen.getByRole('region', { name: 'App status' });
    expect(within(footer).getByRole('status')).toHaveTextContent('Preparing YouTube preview');
    expect(
      within(footer).getByRole('progressbar', { name: 'Preparing audio preview' }),
    ).toBeVisible();
    expect(
      within(screen.getByRole('contentinfo', { name: 'Playback' })).queryByText(
        /Preparing YouTube/,
      ),
    ).toBeNull();
    await user.click(within(footer).getByRole('button', { name: 'Cancel preparing preview' }));
    expect(cancel).toHaveBeenCalledWith('12-abcdefghijk');
    expect(await within(footer).findByText('DISCOGS DISCOVERY')).toBeVisible();
    expect(within(footer).queryByRole('progressbar')).not.toBeInTheDocument();
  } finally {
    Reflect.deleteProperty(window, 'audioPreviews');
  }
});

test.each(['success', 'failure'])(
  'removes footer progress when preview preparation ends in %s',
  async (outcome) => {
    let finish: (result: AudioResult<LocalTrack>) => void = () => undefined;
    const pending = new Promise<AudioResult<LocalTrack>>((resolve) => {
      finish = resolve;
    });
    Reflect.set(window, 'audioPreviews', { prepare: () => pending, cancel: vi.fn() });
    const audio: AudioBridge = {
      list: () => Promise.resolve({ ok: true, value: [] }),
      probe: () =>
        Promise.resolve({ ok: true, value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' } }),
      download: vi.fn(),
      reveal: vi.fn(),
    };
    try {
      const user = userEvent.setup();
      render(
        <App
          audioLibrary={audio}
          crate={{
            list: () => Promise.resolve({ ok: true, value: [loadedRelease] }),
            save: vi.fn(),
            remove: vi.fn(),
          }}
        />,
      );
      await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
      await user.click(await screen.findByRole('button', { name: 'Preview audio' }));
      const footer = screen.getByRole('region', { name: 'App status' });
      expect(
        within(footer).getByRole('progressbar', { name: 'Preparing audio preview' }),
      ).toBeVisible();
      await act(async () => {
        finish(
          outcome === 'success'
            ? {
                ok: true,
                value: {
                  id: '12-abcdefghijk',
                  releaseId: 12,
                  videoId: 'abcdefghijk',
                  title: 'Quiet Orbit',
                  sourceTitle: 'Low Tide Quiet Orbit',
                  trackIndex: 0,
                  artist: 'Low Tide',
                  album: 'Quiet Orbit EP',
                  artworkUrl: null,
                  filename: 'Quiet Orbit.yt.mp3',
                  warning: null,
                },
              }
            : { ok: false, error: { code: 'network', message: 'Preview unavailable' } },
        );
        await pending;
      });
      expect(await within(footer).findByText('DISCOGS DISCOVERY')).toBeVisible();
      expect(within(footer).queryByRole('progressbar')).not.toBeInTheDocument();
    } finally {
      Reflect.deleteProperty(window, 'audioPreviews');
    }
  },
);
