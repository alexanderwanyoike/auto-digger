import { _electron as electron, expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import NodeID3 from 'node-id3';
import { loadedRelease } from '../discogs-fixtures';

test('previews YouTube without saving, reuses the temporary file and saves style-tagged audio', async () => {
  const log = test.info().outputPath('downloads.log');
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      AUTO_DIGGER_TEST_DOWNLOAD_LOG: log,
    },
  });
  try {
    const page = await desktop.firstWindow();
    await page.evaluate((release) => window.crate?.save(release), {
      ...loadedRelease,
      videos: [
        { title: 'Low Tide Quiet Orbit', url: 'https://www.youtube.com/watch?v=slowvideo01' },
      ],
    });
    await page.reload();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    const preview = page.getByRole('button', { name: 'Preview audio', exact: true });
    await expect(preview).toBeVisible({ timeout: 2000 });
    await preview.click();
    await expect(page.getByRole('button', { name: 'Download audio', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect(page.locator('.playback-bar')).toContainText('Preview');
    expect(await page.evaluate(() => window.audioLibrary?.list())).toEqual({ ok: true, value: [] });
    await expect(preview).toBeEnabled();
    await preview.click();
    await expect(preview).toBeEnabled();
    await page.getByRole('button', { name: 'Download audio', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.audioLibrary?.list()))
      .toMatchObject({ ok: true, value: [{ id: '12-slowvideo01' }] });
    const saved = await page.evaluate(() => window.audioLibrary?.list());
    if (!saved?.ok || !saved.value[0]) throw new Error('Expected a saved preview');
    const music = await desktop.evaluate(({ app }) => app.getPath('music'));
    const file = join(
      music,
      'Auto Digger',
      'YouTube',
      'Electronic',
      'Deep House',
      '1998',
      saved.value[0].filename,
    );
    expect(await NodeID3.Promise.read(file)).toMatchObject({
      title: 'Quiet Orbit',
      artist: 'Low Tide',
      album: 'Quiet Orbit EP',
      genre: 'Deep House',
      trackNumber: '1',
    });
    expect((await readFile(log, 'utf8')).trim().split('\n')).toHaveLength(1);
    await expect(page.locator('.playback-bar')).not.toContainText('Preview ·');
    const alias = await desktop.evaluate(async ({ net }) => {
      const response = await net.fetch('auto-digger-audio://preview/12-slowvideo01', {
        headers: { Range: 'bytes=0-9' },
      });
      return { status: response.status, size: (await response.arrayBuffer()).byteLength };
    });
    expect(alias).toEqual({ status: 206, size: 10 });
    await page.screenshot({ path: test.info().outputPath('saved-preview.png') });
  } finally {
    await desktop.close();
  }
});
