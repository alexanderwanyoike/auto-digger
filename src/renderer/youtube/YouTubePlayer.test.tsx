import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { YouTubePlayer } from './YouTubePlayer';
import type { YouTubeOptions } from './types';

test('shows official player events, retries errors and destroys replaced players', async () => {
  const destroy = vi.fn();
  const pauseVideo = vi.fn();
  const instances: YouTubeOptions[] = [];
  class Player {
    destroy = destroy;

    pauseVideo = pauseVideo;

    constructor(_element: HTMLElement, options: YouTubeOptions) {
      instances.push(options);
    }
  }
  vi.stubGlobal('YT', { Player });
  const user = userEvent.setup();
  const view = render(
    <YouTubePlayer
      videos={[
        { title: 'First track', url: 'https://youtu.be/abcdefghijk' },
        { title: 'Second track', url: 'https://youtu.be/lmnopqrstuv' },
      ]}
    />,
  );
  expect(await screen.findByText('Loading YouTube player…')).toBeInTheDocument();
  await act(async () => {
    await Promise.resolve();
    instances[0]?.events.onReady();
  });
  expect(screen.getByText('Ready. Press play in the video.')).toBeInTheDocument();
  act(() => instances[0]?.events.onStateChange({ data: 1 }));
  expect(screen.getByText('Playing')).toBeInTheDocument();
  act(() => instances[0]?.events.onError({ data: 150 }));
  expect(screen.getByRole('alert')).toHaveTextContent('Embedding is disabled');
  await user.click(screen.getByRole('button', { name: 'Retry video' }));
  expect(destroy).toHaveBeenCalledTimes(1);
  await user.selectOptions(screen.getByLabelText('Attached YouTube video'), 'lmnopqrstuv');
  expect(instances.at(-1)?.videoId).toBe('lmnopqrstuv');
  expect(destroy).toHaveBeenCalledTimes(2);
  view.unmount();
  expect(destroy).toHaveBeenCalledTimes(3);
});
