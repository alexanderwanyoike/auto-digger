import { join } from 'node:path';
import { expect, test } from 'vitest';
import { loadedRelease } from '../../../tests/discogsFixtures';
import { downloadDirectory } from './download-directory';

test('uses portable folder names for bare metadata and explicit fallbacks without losing source order', () => {
  expect(
    downloadDirectory(
      '/music',
      { layout: 'custom', folders: ['source', 'label', 'artist', 'genre', 'year'] },
      {
        ...loadedRelease,
        artists: ['CON'],
        labels: [{ name: 'LPT1.flac', catalogueNumber: '' }],
        genres: [],
        year: null,
      },
      'Soulseek',
    ),
  ).toEqual({
    ok: true,
    value: join('/music', 'Soulseek', '_LPT1.flac', '_CON', 'Unknown genre', 'Unknown year'),
  });
});
