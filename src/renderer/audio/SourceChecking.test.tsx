import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AudioBridge, AudioResult, AudioSource } from '../../shared/audio';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { App } from '../App';

test.each(['success', 'failure'] as const)(
  'keeps availability loading inside the download control until %s',
  async (outcome) => {
    let finish: (result: AudioResult<AudioSource>) => void = () => undefined;
    const probe = vi.fn<AudioBridge['probe']>().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <App
        crate={{
          list: () => Promise.resolve({ ok: true, value: [loadedRelease] }),
          save: vi.fn(),
          remove: vi.fn(),
        }}
        audioLibrary={{
          list: () => Promise.resolve({ ok: true, value: [] }),
          probe,
          download: vi.fn(),
          reveal: vi.fn(),
        }}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
    const control = screen.getByRole('button', { name: 'Download audio' });
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
    expect(
      within(control).getByRole('progressbar', { name: 'Checking audio availability' }),
    ).not.toHaveAttribute('aria-valuenow');
    expect(screen.queryByText('Checking…')).not.toBeInTheDocument();
    await act(() => {
      finish(
        outcome === 'success'
          ? { ok: true, value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' } }
          : { ok: false, error: { code: 'network', message: 'Could not check this upload.' } },
      );
      return Promise.resolve();
    });
    expect(
      screen.queryByRole('progressbar', { name: 'Checking audio availability' }),
    ).not.toBeInTheDocument();
    expect(control).toHaveAttribute('aria-busy', 'false');
    if (outcome === 'success') expect(control).toBeEnabled();
    else {
      expect(control).toBeDisabled();
      expect(screen.getByRole('alert')).toHaveTextContent('Could not check this upload.');
      await user.click(screen.getByRole('button', { name: 'Check again' }));
      expect(
        within(control).getByRole('progressbar', { name: 'Checking audio availability' }),
      ).toBeVisible();
      await act(() => {
        finish({
          ok: true,
          value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' },
        });
        return Promise.resolve();
      });
      expect(control).toBeEnabled();
    }
  },
);
