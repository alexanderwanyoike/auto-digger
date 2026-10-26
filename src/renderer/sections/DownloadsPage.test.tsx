import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { AudioBridge, LocalTrack } from '../../shared/audio';
import { downloadStage } from '../../shared/download-jobs';
import type { DownloadJob, DownloadJobsBridge } from '../../shared/download-jobs';
import { useAudioLibrary } from '../audio/use-audio-library';
import { DownloadsPage } from './DownloadsPage';

test.each(['failed', 'cancelled'] as const)(
  'keeps a missing file explicit after its recovery download is %s',
  async (stage) => {
    const track: LocalTrack = {
      id: '12-abcdefghijk',
      releaseId: 12,
      videoId: 'abcdefghijk',
      title: 'Quiet Orbit',
      sourceTitle: 'Quiet Orbit',
      trackIndex: 0,
      artist: 'Low Tide',
      album: 'Quiet Orbit EP',
      artworkUrl: null,
      filename: 'Quiet Orbit.yt.mp3',
      warning: null,
      missing: true,
    };
    const job: DownloadJob = {
      ...downloadStage(stage),
      id: '00000000-0000-4000-8000-000000000001',
      sourceId: track.id,
      title: track.title,
      releaseId: track.releaseId,
      videoIndex: 0,
      track: null,
      error: stage === 'failed' ? { code: 'unavailable', message: 'Try again' } : null,
    };
    const bridge: AudioBridge = {
      list: () => Promise.resolve({ ok: true, value: [track] }),
      probe: vi.fn(),
      download: vi.fn(),
      reveal: vi.fn(),
    };
    const jobs: DownloadJobsBridge = {
      list: () => Promise.resolve({ ok: true, value: [job] }),
      start: vi.fn(),
      cancel: vi.fn(),
      retry: vi.fn(),
    };
    function Harness() {
      const audio = useAudioLibrary(bridge, jobs);
      return <DownloadsPage audio={audio} />;
    }
    render(<Harness />);
    expect(await screen.findByRole('button', { name: 'Retry download Quiet Orbit' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Play Quiet Orbit' })).toBeDisabled();
    expect(screen.getByText('File missing or unavailable')).toBeVisible();
  },
);

test('guides an empty library to downloading from the digging desk', async () => {
  const bridge: AudioBridge = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    probe: vi.fn(),
    download: vi.fn(),
    reveal: vi.fn(),
  };
  function Harness() {
    return <DownloadsPage audio={useAudioLibrary(bridge)} />;
  }
  render(<Harness />);
  expect(
    await screen.findByText('No downloads yet. Download a track from the digging desk.'),
  ).toBeVisible();
});

test('labels sources and combines the source filter with the existing library search', async () => {
  const base: LocalTrack = {
    id: '12-abcdefghijk',
    releaseId: 12,
    videoId: 'abcdefghijk',
    title: 'Quiet Orbit',
    sourceTitle: 'Quiet Orbit',
    trackIndex: 0,
    artist: 'Low Tide',
    album: 'Quiet Orbit EP',
    artworkUrl: null,
    filename: 'Quiet Orbit.yt.mp3',
    warning: null,
  };
  const soulseek: LocalTrack = {
    ...base,
    id: `13-slsk-${'a'.repeat(32)}`,
    releaseId: 13,
    provider: 'soulseek',
    videoId: null,
    soulseek: { username: 'peer', filename: 'Night Tide.flac', size: 123 },
    title: 'Night Tide',
    album: 'Night Tide EP',
    filename: 'Night Tide.slsk.flac',
  };
  const bridge: AudioBridge = {
    list: () => Promise.resolve({ ok: true, value: [base, soulseek] }),
    probe: vi.fn(),
    download: vi.fn(),
    reveal: vi.fn(),
  };
  function Harness() {
    return <DownloadsPage audio={useAudioLibrary(bridge)} />;
  }
  const user = userEvent.setup();
  render(<Harness />);
  const youtube = await screen.findByRole('row', { name: /Quiet Orbit.*Low Tide/ });
  const slsk = screen.getByRole('row', { name: /Night Tide.*Low Tide/ });
  expect(within(youtube).getByText('YouTube')).toBeVisible();
  expect(within(slsk).getByText('Soulseek')).toBeVisible();
  const source = screen.getByRole('combobox', { name: 'Filter downloads by source' });
  await user.selectOptions(source, 'soulseek');
  expect(screen.queryByRole('button', { name: 'Play Quiet Orbit' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play Night Tide' })).toBeVisible();
  expect(screen.getByText('1 track')).toBeVisible();
  await user.type(screen.getByRole('searchbox', { name: 'Search downloads' }), 'Quiet');
  expect(screen.getByText('No tracks match this search.')).toBeVisible();
  await user.selectOptions(source, 'youtube');
  expect(screen.getByRole('button', { name: 'Play Quiet Orbit' })).toBeVisible();
  await user.clear(screen.getByRole('searchbox', { name: 'Search downloads' }));
  await user.selectOptions(source, 'all');
  expect(screen.getByText('2 tracks')).toBeVisible();
});
