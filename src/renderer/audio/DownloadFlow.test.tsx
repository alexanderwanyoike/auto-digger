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
  artist: 'Low Tide',
  album: 'Quiet Orbit EP',
  artworkUrl: null,
  filename: 'Evening Mix.yt.mp3',
  warning: 'Discogs artwork could not be embedded.',
};

test('shows all sources, suggests track matches, accepts corrections and loads downloaded audio into the bottom player', async () => {
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
  expect(within(rows[0]!).getByLabelText('Discogs track')).toHaveValue('0');
  expect(within(rows[1]!).getByLabelText('Discogs track')).toHaveValue('');
  await user.selectOptions(within(rows[1]!).getByLabelText('Discogs track'), '1');
  await user.click(await within(rows[1]!).findByRole('button', { name: 'Download audio' }));
  expect(bridge.download).toHaveBeenCalledWith({ release, videoIndex: 1, trackIndex: 1 });
  const player = screen.getByRole('contentinfo', { name: 'Playback' });
  expect(await within(player).findByText('Evening Mix')).toBeInTheDocument();
  const audio = document.querySelector('audio');
  expect(audio).toHaveAttribute('src', 'auto-digger-audio://track/12-lmnopqrstuv');
  if (!audio) throw new Error('Missing local audio element');
  fireEvent.canPlay(audio);
  expect(play).toHaveBeenCalled();
  fireEvent.play(audio);
  expect(within(player).getByRole('button', { name: 'Pause' })).toBeEnabled();
  await user.click(within(player).getByRole('button', { name: 'Show track in folder' }));
  expect(bridge.reveal).toHaveBeenCalledWith(track.id);
  expect(screen.getByText(track.warning ?? '')).toBeVisible();
  expect(document.querySelector('iframe')).toBeNull();
});
