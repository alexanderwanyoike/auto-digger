import { _electron as electron, expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';
import { startSlskdFixture } from '../slskd-server';

test('keeps preview cancellation available across provider and page changes', async () => {
  const directory = test.info().outputPath('completed');
  await mkdir(directory, { recursive: true });
  const service = await startSlskdFixture(directory, true);
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
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('slskd URL', { exact: true }).fill(service.url);
    await page.getByLabel('slskd API key', { exact: true }).fill('fixture-key');
    await page.getByLabel('slskd completed-downloads folder', { exact: true }).fill(directory);
    await page.getByRole('button', { name: 'Connect slskd', exact: true }).click();
    await expect(page.getByText('slskd connection saved.', { exact: true })).toBeVisible();
    await page.evaluate((release) => window.crate?.save(release), loadedRelease);
    await page.reload();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    await page.getByRole('button', { name: 'Soulseek', exact: true }).click();
    await page
      .getByRole('button', { name: 'Search release · Quiet Orbit EP', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Preview Quiet Orbit.flac from archive_peer', exact: true })
      .click();
    await expect.poll(() => service.downloads()).toBe(1);
    await page.getByRole('button', { name: 'YouTube', exact: true }).click();
    const cancel = page
      .getByRole('region', { name: 'App status' })
      .getByRole('button', { name: 'Cancel preparing preview', exact: true });
    await expect(cancel).toBeVisible();
    const spinner = page
      .getByRole('region', { name: 'App status' })
      .getByRole('progressbar', { name: 'Preparing audio preview', exact: true });
    await expect(spinner).toBeVisible();
    expect(await spinner.getAttribute('aria-valuenow')).toBeNull();
    expect(await spinner.evaluate((element) => getComputedStyle(element).animationName)).toBe(
      'source-spin',
    );
    await expect(page.getByRole('contentinfo', { name: 'Playback' })).not.toContainText(
      'Preparing Soulseek',
    );
    await page.getByRole('button', { name: 'Downloads', exact: true }).click();
    await expect(cancel).toBeVisible();
    expect(await page.evaluate(() => window.audioLibrary?.list())).toEqual({ ok: true, value: [] });
    await page.screenshot({ path: test.info().outputPath('preview-cancellation.png') });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(spinner).toBeVisible();
    expect(await spinner.evaluate((element) => getComputedStyle(element).animationName)).toBe(
      'none',
    );
    await cancel.click();
    await expect(cancel).toHaveCount(0);
    await expect(spinner).toHaveCount(0);
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByRole('button', { name: 'Preview audio', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect(spinner).toHaveCount(0);
    expect(await page.evaluate(() => window.audioLibrary?.list())).toEqual({ ok: true, value: [] });
  } finally {
    await desktop.close();
    await service.close();
  }
});
