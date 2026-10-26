import { join } from 'node:path';
import { expect, test } from 'vitest';
import { loadedRelease } from '../../../tests/discogs-fixtures';
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

test.each(['YouTube', 'Soulseek'] as const)(
  'uses the first Discogs style as a subgenre folder for %s',
  (source) => {
    expect(
      downloadDirectory(
        '/music',
        { layout: 'custom', folderTemplate: '<genre>/<subgenre>/<artist>' },
        {
          ...loadedRelease,
          styles: ['Deep/House', 'Techno'],
        },
        source,
      ),
    ).toEqual({ ok: true, value: join('/music', 'Electronic', 'DeepHouse', 'Low Tide') });
  },
);

test.each([{ styles: [] }, { styles: ['   '] }])(
  'uses an explicit subgenre fallback when the first style is unavailable: $styles',
  ({ styles }) => {
    expect(
      downloadDirectory(
        '/music',
        { layout: 'custom', folderTemplate: '<genre>/<subgenre>' },
        {
          ...loadedRelease,
          styles,
        },
        'Soulseek',
      ),
    ).toEqual({ ok: true, value: join('/music', 'Electronic', 'Unknown subgenre') });
  },
);
