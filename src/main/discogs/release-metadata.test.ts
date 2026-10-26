import { expect, test } from 'vitest';
import { releaseMetadataSchema } from './release-metadata';

test('retains indexed tracks and nested sub-tracks in Discogs order', () => {
  const result = releaseMetadataSchema.safeParse({
    id: 12,
    title: 'Suite EP',
    tracklist: [
      {
        position: 'A',
        type_: 'index',
        title: 'Suite',
        duration: '12:00',
        sub_tracks: [
          { position: 'A.1', title: 'First movement', duration: '5:00' },
          {
            position: 'A.2',
            title: 'Second movement',
            duration: '7:00',
            sub_tracks: [{ position: 'A.2.a', title: 'Coda', duration: '2:00' }],
          },
        ],
      },
    ],
  });
  expect(result.success).toBe(true);
  if (result.success)
    expect(result.data.tracks).toEqual([
      { position: 'A', title: 'Suite', duration: '12:00' },
      { position: 'A.1', title: 'First movement', duration: '5:00' },
      { position: 'A.2', title: 'Second movement', duration: '7:00' },
      { position: 'A.2.a', title: 'Coda', duration: '2:00' },
    ]);
});
