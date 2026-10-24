import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AudioBridge, LocalTrack } from '../../shared/audio';
import type { CrateBridge } from '../../shared/crate';
import { loadedRelease } from '../../../tests/discogsFixtures';
import { App } from '../App';

const release = {
  ...loadedRelease,
  tracks: [...loadedRelease.tracks, { position: 'B1', title: 'Evening Mix', duration: '5:00' }],
  videos: [
    ...loadedRelease.videos,
    { title: 'Unknown upload', url: 'https://youtu.be/lmnopqrstuv' },
  ],
};
const track: LocalTrack = {
  id: '12-lmnopqrstuv',
  releaseId: 12,
  videoId: 'lmnopqrstuv',
  title: 'Evening Mix',
  sourceTitle: 'Unknown upload',
  trackIndex: 1,
  artist: 'Low Tide',
  album: 'Quiet Orbit EP',
  artworkUrl: null,
  filename: 'Evening Mix.yt.mp3',
  warning: 'Discogs artwork could not be embedded.',
};

test('shows all sources, suggests track matches, accepts corrections and loads downloaded audio into the bottom player', async () => {
  const audio = new Audio();
  function TestAudio() {
    return audio;
  }
  vi.stubGlobal('Audio', TestAudio);
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  const bridge: AudioBridge = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    probe: (url) =>
      Promise.resolve({
        ok: true,
        value: {
          videoId: url.includes('lmnopqrstuv') ? 'lmnopqrstuv' : 'abcdefghijk',
          title: url.includes('lmnopqrstuv') ? 'Unknown upload' : 'Low Tide - Quiet Orbit',
        },
      }),
    download: vi.fn<AudioBridge['download']>().mockResolvedValue({ ok: true, value: track }),
    reveal: vi.fn<AudioBridge['reveal']>().mockResolvedValue({ ok: true, value: undefined }),
  };
  const crate: CrateBridge = {
    list: () => Promise.resolve({ ok: true, value: [release] }),
    save: vi.fn(),
    remove: vi.fn(),
  };
  const user = userEvent.setup();
  render(<App crate={crate} audioLibrary={bridge} />);
  await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
  const sources = screen.getByRole('region', { name: 'Audio sources' });
  const rows = within(sources).getAllByRole('listitem');
  expect(rows).toHaveLength(2);
  const [first, second] = rows;
  if (!first || !second) throw new Error('Expected two sources');
  expect(within(first).getByLabelText('Discogs track')).toHaveValue('0');
  expect(within(second).getByLabelText('Discogs track')).toHaveValue('');
  await user.selectOptions(within(second).getByLabelText('Discogs track'), '1');
  await user.click(await within(second).findByRole('button', { name: 'Download audio' }));
  expect(bridge.download).toHaveBeenCalledWith({ release, videoIndex: 1, trackIndex: 1 });
  const player = screen.getByRole('contentinfo', { name: 'Playback' });
  expect(await within(player).findByText('Evening Mix')).toBeInTheDocument();
  expect(audio.src).toBe('auto-digger-audio://track/12-lmnopqrstuv');
  fireEvent.canPlay(audio);
  expect(play).toHaveBeenCalled();
  fireEvent.play(audio);
  expect(within(player).getByRole('button', { name: 'Pause' })).toBeEnabled();
  await user.click(within(player).getByRole('button', { name: 'Show track in folder' }));
  expect(bridge.reveal).toHaveBeenCalledWith(track.id);
  expect(screen.getByText(track.warning ?? '')).toBeVisible();
  expect(document.querySelector('iframe')).toBeNull();
});

test('keeps saved sources playable offline and lets their track assignment be corrected', async () => {
  const saved = { ...track, title: 'Unknown upload', trackIndex: null };
  const bridge: AudioBridge = {
    list: () => Promise.resolve({ ok: true, value: [saved] }),
    probe: () => Promise.resolve({ ok: false, error: { code: 'network', message: 'Offline' } }),
    download: vi.fn<AudioBridge['download']>().mockResolvedValue({ ok: true, value: track }),
    reveal: vi.fn(),
  };
  const crate: CrateBridge = {
    list: () => Promise.resolve({ ok: true, value: [release] }),
    save: vi.fn(),
    remove: vi.fn(),
  };
  const user = userEvent.setup();
  render(<App crate={crate} audioLibrary={bridge} />);
  await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
  const rows = within(screen.getByRole('region', { name: 'Audio sources' })).getAllByRole(
    'listitem',
  );
  const row = rows[1];
  if (!row) throw new Error('Expected second source');
  expect(within(row).getByRole('button', { name: 'Play track' })).toBeEnabled();
  expect(within(row).getByLabelText('Discogs track')).toHaveValue('');
  await user.selectOptions(within(row).getByLabelText('Discogs track'), '1');
  await user.click(within(row).getByRole('button', { name: 'Update tags' }));
  expect(bridge.download).toHaveBeenCalledWith({ release, videoIndex: 1, trackIndex: 1 });
  expect(
    within(screen.getByRole('contentinfo', { name: 'Playback' })).getByText('Evening Mix'),
  ).toBeVisible();
});

test('explains an unavailable source and lets the user retry without losing the release', async () => {
  const probe = vi
    .fn<AudioBridge['probe']>()
    .mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'unavailable',
        message: 'This video is private or no longer available. Try another source.',
      },
    })
    .mockResolvedValue({
      ok: true,
      value: { videoId: 'abcdefghijk', title: 'Low Tide - Quiet Orbit' },
    });
  const bridge: AudioBridge = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    probe,
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
  expect(await screen.findByRole('alert')).toHaveTextContent('private or no longer available');
  expect(screen.getByRole('button', { name: 'Download audio' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Check again' }));
  expect(await screen.findByRole('button', { name: 'Download audio' })).toBeEnabled();
});
