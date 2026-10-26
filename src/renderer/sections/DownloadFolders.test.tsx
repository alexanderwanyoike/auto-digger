import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { defaultPreferences } from '../../shared/preferences';
import { DownloadFolders } from './DownloadFolders';

test('previews portable folder names and byte limits used for saved downloads', () => {
  render(
    <DownloadFolders
      template={`CON/${'x'.repeat(80)}/<release>`}
      root="/music"
      disabled={false}
      onSave={() => Promise.resolve({ ok: true, value: defaultPreferences })}
    />,
  );
  expect(screen.getByLabelText('Folder preview')).toHaveTextContent(
    `/music / _CON / ${'x'.repeat(70)} / Quiet Orbit EP [r12] / track.mp3`,
  );
});
