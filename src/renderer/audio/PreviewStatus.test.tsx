import { render, screen, within } from '@testing-library/react';
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
      within(screen.getByRole('contentinfo', { name: 'Playback' })).queryByText(
        /Preparing YouTube/,
      ),
    ).toBeNull();
    await user.click(within(footer).getByRole('button', { name: 'Cancel preparing preview' }));
    expect(cancel).toHaveBeenCalledWith('12-abcdefghijk');
    expect(await within(footer).findByText('DISCOGS DISCOVERY')).toBeVisible();
  } finally {
    Reflect.deleteProperty(window, 'audioPreviews');
  }
});
