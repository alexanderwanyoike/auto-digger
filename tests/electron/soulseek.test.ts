import { _electron as electron, expect, test } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';
import { startSlskdFixture } from '../slskd-server';

test('downloads Soulseek audio through the desktop queue into ordered library folders and restores it after restart', async () => {
  const directory = test.info().outputPath('slskd-completed');
  await mkdir(directory, { recursive: true });
  const service = await startSlskdFixture(directory);
  const options = {
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
  };
  let desktop = await electron.launch(options);
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('slskd URL', { exact: true }).fill(service.url);
    await page.getByLabel('slskd API key', { exact: true }).fill('fixture-key');
    await page.getByLabel('slskd completed-downloads folder', { exact: true }).fill(directory);
    await page.getByRole('button', { name: 'Connect slskd', exact: true }).click();
    await expect(page.getByText('slskd connection saved.', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Folder layout')).toHaveValue(
      '<source>/<genre>/<subgenre>/<year>',
    );
    await page
      .getByLabel('Folder layout')
      .fill('<source>/<genre>/<subgenre>/<year>/<label>/<artist>/<release>');
    await page.getByRole('button', { name: 'Save folder layout', exact: true }).click();
    await page
      .locator('.download-folders')
      .screenshot({ path: test.info().outputPath('folder-settings.png') });
    await page.evaluate(async (release) => window.crate?.save(release), {
      ...loadedRelease,
      videos: [],
    });
    await page.reload();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    await page.getByRole('button', { name: 'Use Soulseek for Quiet Orbit', exact: true }).click();
    const table = page.getByRole('table', { name: 'Soulseek search results' });
    await expect(table.getByRole('row')).toHaveCount(41);
    const geometry = await table.evaluate((element) => ({
      height: element.parentElement?.clientHeight,
      scroll: element.parentElement?.scrollHeight,
    }));
    expect(geometry.height).toBeLessThanOrEqual(240);
    expect(geometry.scroll).toBeGreaterThan(240);
    await page
      .getByRole('region', { name: 'Soulseek matches', exact: true })
      .screenshot({ path: test.info().outputPath('soulseek-results.png') });
    await table
      .getByRole('button', { name: 'Download Quiet Orbit.flac from archive_peer', exact: true })
      .click();
    await expect(page.getByText('Saved from Soulseek', { exact: true })).toBeVisible();
    const tracks = await page.evaluate(async () => window.audioLibrary?.list());
    if (!tracks?.ok || !tracks.value[0]) throw new Error('Expected a Soulseek library entry');
    const track = tracks.value[0];
    const music = await desktop.evaluate(({ app }) => app.getPath('music'));
    const file = join(
      music,
      'Auto Digger',
      'Soulseek',
      'Electronic',
      'Deep House',
      '1998',
      'Still Records',
      'Low Tide',
      'Quiet Orbit EP [r12]',
      track.filename,
    );
    expect(await readFile(file)).toEqual(await readFile(resolve('tests/fixtures/tone.flac')));
    const streamed = await desktop.evaluate(async ({ net }, id) => {
      const response = await net.fetch(`auto-digger-audio://track/${id}`, {
        headers: { Range: 'bytes=0-63' },
      });
      return {
        status: response.status,
        type: response.headers.get('Content-Type'),
        size: (await response.arrayBuffer()).byteLength,
      };
    }, track.id);
    expect(streamed).toEqual({ status: 206, type: 'audio/flac', size: 64 });
    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Downloads', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByLabel('Folder layout')).toHaveValue(
      '<source>/<genre>/<subgenre>/<year>/<label>/<artist>/<release>',
    );
    await expect(page.getByLabel('slskd API key', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('slskd completed-downloads folder', { exact: true })).toHaveValue(
      directory,
    );
  } finally {
    await desktop.close();
    await service.close();
  }
});
