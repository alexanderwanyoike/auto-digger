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

test('previews a Soulseek EP result, then saves the same MP3 with Discogs assignment and style tags', async () => {
  const { mkdir } = await import('node:fs/promises');
  const { startSlskdFixture } = await import('../slskd-server');
  const directory = test.info().outputPath('completed');
  await mkdir(directory, { recursive: true });
  const service = await startSlskdFixture(directory, false, 'mp3');
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
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('slskd URL', { exact: true }).fill(service.url);
    await page.getByLabel('slskd API key', { exact: true }).fill('fixture-key');
    await page.getByLabel('slskd completed-downloads folder', { exact: true }).fill(directory);
    await page.getByRole('button', { name: 'Connect slskd', exact: true }).click();
    await expect(page.getByText('slskd connection saved.', { exact: true })).toBeVisible();
    await page.evaluate((release) => window.crate?.save(release), { ...loadedRelease, videos: [] });
    await page.reload();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    await page.getByRole('button', { name: 'Soulseek', exact: true }).click();
    await page
      .getByRole('button', { name: 'Search release · Quiet Orbit EP', exact: true })
      .click();
    const preview = page.getByRole('button', {
      name: 'Preview Quiet Orbit.mp3 from archive_peer',
      exact: true,
    });
    await expect(preview).toBeVisible({ timeout: 2000 });
    await preview.click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.audioLibrary?.list())).toEqual({ ok: true, value: [] });
    await expect(preview).toBeEnabled();
    await preview.click();
    await expect(preview).toBeEnabled();
    await page
      .getByRole('button', { name: 'Download Quiet Orbit.mp3 from archive_peer', exact: true })
      .click();
    await expect(
      page
        .getByRole('table', { name: 'Soulseek search results' })
        .getByText('Saved', { exact: true }),
    ).toBeVisible();
    const result = await page.evaluate(() => window.audioLibrary?.list());
    if (!result?.ok || !result.value[0]) throw new Error('Expected a saved Soulseek preview');
    expect(result.value[0]).toMatchObject({
      title: 'Quiet Orbit',
      trackIndex: 0,
      provider: 'soulseek',
    });
    const music = await desktop.evaluate(({ app }) => app.getPath('music'));
    const file = join(
      music,
      'Auto Digger',
      'Soulseek',
      'Electronic',
      'Deep House',
      '1998',
      result.value[0].filename,
    );
    expect(await NodeID3.Promise.read(file)).toMatchObject({
      title: 'Quiet Orbit',
      artist: 'Low Tide',
      album: 'Quiet Orbit EP',
      genre: 'Deep House',
      trackNumber: '1',
    });
    expect(service.downloads()).toBe(1);
  } finally {
    await desktop.close();
    await service.close();
  }
});
