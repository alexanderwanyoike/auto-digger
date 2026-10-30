import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';

test('plays and retags a saved source whose assignment belongs to a newer tracklist', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    ),
  });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk', exact: true }).waitFor();
    await page.evaluate(async (release) => {
      const saved = await window.audioLibrary?.download({
        release: {
          ...release,
          tracks: [...release.tracks, { position: 'B1', title: 'Old second track', duration: '' }],
        },
        videoIndex: 0,
        trackIndex: 1,
      });
      if (!saved?.ok) throw new Error('Could not prepare saved track');
      await window.crate?.save(release);
    }, loadedRelease);
    await desktop.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('audio:probe');
      ipcMain.handle('audio:probe', () => ({
        ok: false,
        error: { code: 'network', message: 'Offline fixture' },
      }));
    });
    await page.reload();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    const sources = page.getByRole('list', { name: 'YouTube audio sources' });
    await sources.getByText('1 unmatched upload', { exact: true }).click();
    await expect(sources.getByLabel('Discogs track')).toHaveValue('');
    await sources.getByRole('button', { name: 'Play track', exact: true }).click();
    await expect(
      page
        .getByRole('contentinfo', { name: 'Playback' })
        .getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await sources.getByLabel('Discogs track').selectOption('0');
    await sources.getByRole('button', { name: 'Update tags', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.audioLibrary?.list()))
      .toMatchObject({
        ok: true,
        value: [{ id: '12-abcdefghijk', trackIndex: 0, title: 'Quiet Orbit' }],
      });
    await expect(sources.getByText('Saved', { exact: true })).toBeVisible();
  } finally {
    await desktop.close();
  }
});
