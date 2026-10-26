import { expect, test } from 'vitest';
import type { LocalTrack } from '../../shared/audio';
import type { DownloadJob } from '../../shared/download-jobs';
import { downloadStage } from '../../shared/download-jobs';
import { libraryRows } from './rows';

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
};
const job: DownloadJob = {
  ...downloadStage('complete'),
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Quiet Orbit',
  releaseId: 12,
  videoIndex: 0,
  sourceId: track.id,
  artist: 'Low Tide',
  album: 'Quiet Orbit EP',
  track,
  error: null,
};

test('shows a saved track once, instead of repeating its completed or superseded queue history', () => {
  const cancelled = { ...job, ...downloadStage('cancelled'), track: null };
  expect(
    libraryRows([track], [cancelled, { ...job, id: '00000000-0000-4000-8000-000000000002' }], ''),
  ).toEqual([{ id: track.id, track, job: null }]);
});

test('keeps a pending retry inline with its track and searches both saved and pending metadata', () => {
  const pending = { ...job, ...downloadStage('downloading'), track: null };
  expect(
    libraryRows(
      [track],
      [pending, { ...job, id: '00000000-0000-4000-8000-000000000002' }],
      'low tide',
    ),
  ).toEqual([{ id: track.id, track, job: pending }]);
  expect(libraryRows([], [pending], 'quiet orbit ep')).toHaveLength(1);
  expect(libraryRows([track], [job], 'no match')).toEqual([]);
});
