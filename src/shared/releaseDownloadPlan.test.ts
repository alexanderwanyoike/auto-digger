import { expect, test } from 'vitest';
import { releaseDownloadPlan } from './releaseDownloadPlan';
import { loadedRelease } from '../../tests/discogsFixtures';

test('plans one source per track and exposes missing, ambiguous and deliberately skipped tracks', () => {
  const release = {
    ...loadedRelease,
    videos: Array.from({ length: 4 }, (_, index) => ({
      title: `Source ${index.toString()}`,
      url: `https://youtu.be/${index.toString().padStart(11, '0')}`,
    })),
    tracks: [
      ...loadedRelease.tracks,
      { position: 'B1', title: 'Evening Mix', duration: '' },
      { position: 'B2', title: 'No source', duration: '' },
    ],
  };
  expect(releaseDownloadPlan(release, [0, 0, 1, null], {})).toMatchObject([
    { state: 'choose', videoIndex: null },
    { state: 'ready', videoIndex: 2 },
    { state: 'missing', videoIndex: null },
  ]);
  expect(releaseDownloadPlan(release, [0, 0, 1, null], { 0: 1, 1: null })).toMatchObject([
    { state: 'ready', videoIndex: 1 },
    { state: 'skipped', videoIndex: null },
    { state: 'missing', videoIndex: null },
  ]);
  expect(releaseDownloadPlan(release, [0, 0, 1, null], { 0: 9 })[0]).toMatchObject({
    state: 'choose',
    videoIndex: null,
  });
});
