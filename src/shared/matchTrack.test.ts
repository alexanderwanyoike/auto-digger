import { expect, test } from 'vitest';
import { matchTrack } from './matchTrack';
import { loadedRelease } from '../../tests/discogsFixtures';

test('matches complete track titles and leaves ambiguous uploads for a manual choice', () => {
  expect(matchTrack(loadedRelease, 'LOW TIDE: Quiet Orbit (1998)')).toBe(0);
  expect(matchTrack(loadedRelease, 'Unknown track')).toBeNull();
  const release = {
    ...loadedRelease,
    tracks: [
      ...loadedRelease.tracks,
      { position: 'B1', title: 'Quiet Orbit (Remix)', duration: '' },
    ],
  };
  expect(matchTrack(release, 'Low Tide - Quiet Orbit Remix')).toBeNull();
  expect(matchTrack(release, 'Entire EP - Quiet Orbit / Quiet Orbit Remix')).toBeNull();
});
