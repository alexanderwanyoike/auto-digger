import { expect, test } from 'vitest';
import { currentFolderTemplate, parseFolderTemplate } from './folder-template';

test.each([
  '../<artist>',
  '/<source>',
  'C:\\Music\\<artist>',
  '<artist>/../<release>',
  '<mood>',
  '<artist',
  '<genre>:<year>',
])('rejects unsafe or unknown folder layouts: %s', (template) => {
  expect(parseFolderTemplate(template)).toMatchObject({ ok: false });
});

test('preserves readable equivalents for existing flat, release and ordered-folder settings', () => {
  expect(currentFolderTemplate({ layout: 'flat' })).toBe('');
  expect(currentFolderTemplate({ layout: 'release' })).toBe('<artist> - <release>');
  expect(
    currentFolderTemplate({ layout: 'custom', folders: ['source', 'artist', 'release'] }),
  ).toBe('<source>/<artist>/<artist> - <release>');
  expect(currentFolderTemplate({ layout: 'custom', folders: ['artist'], folderTemplate: '' })).toBe(
    '',
  );
});
