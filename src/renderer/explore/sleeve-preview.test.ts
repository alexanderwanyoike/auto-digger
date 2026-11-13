import { expect, test, vi } from 'vitest';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { audioFailure } from '../../shared/audio-failure';
import type { AudioBridge, DownloadInput, LocalTrack } from '../../shared/audio';
import { sleevePreview } from './sleeve-preview';

const saved: LocalTrack = {
  id: '12-lmnopqrstuv',
  title: 'Driftwood',
  sourceTitle: 'Low Tide - Driftwood',
  artist: 'Low Tide',
  album: 'Quiet Orbit EP',
  artworkUrl: null,
  filename: 'driftwood.mp3',
  releaseId: 12,
  videoId: 'lmnopqrstuv',
  warning: null,
  trackIndex: 1,
};

test('tries a second candidate and uses a verified saved file during an outage', async () => {
  const release = {
    ...loadedRelease,
    tracks: [...loadedRelease.tracks, { position: 'B1', title: 'Driftwood', duration: '' }],
    videos: [
      ...loadedRelease.videos,
      { title: 'Low Tide - Driftwood', url: 'https://youtu.be/lmnopqrstuv' },
    ],
  };
  const probe = vi
    .fn<AudioBridge['probe']>()
    .mockResolvedValue(audioFailure('network', 'Upload unavailable.'));
  const preview = vi
    .fn<(input: DownloadInput) => ReturnType<AudioBridge['download']>>()
    .mockResolvedValue({ ok: true, value: saved });

  await expect(
    sleevePreview(() => Promise.resolve({ ok: true, value: release }), probe, preview, release.id, [
      saved,
    ]),
  ).resolves.toEqual({ ok: true, value: saved });
  expect(probe).toHaveBeenCalledTimes(1);
  expect(preview).toHaveBeenCalledWith({ release, videoIndex: 1, trackIndex: 1 });
});
