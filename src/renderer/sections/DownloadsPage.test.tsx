import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { AudioBridge, LocalTrack } from '../../shared/audio';
import { downloadStage } from '../../shared/downloadJobs';
import type { DownloadJob, DownloadJobsBridge } from '../../shared/downloadJobs';
import { useAudioLibrary } from '../audio/useAudioLibrary';
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
      preview: vi.fn(),
      stopPreview: vi.fn(),
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
