import { _electron as electron, expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';
import { startSlskdFixture } from '../slskd-server';

test('shows a waiting Soulseek peer, queues YouTube and continues after cancellation', async () => {
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
    await page.getByRole('button', { name: 'Search A1 · Quiet Orbit', exact: true }).click();
    await page
      .getByRole('button', { name: 'Download Quiet Orbit.flac from archive_peer', exact: true })
      .click();
    await page.getByRole('button', { name: 'Downloads', exact: true }).click();
    await expect(page.getByText('Waiting for peer', { exact: true })).toBeVisible();
    await expect(page.getByText('Downloading · 0%', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    const sources = page.getByRole('region', { name: 'Audio sources', exact: true });
    await sources.getByRole('button', { name: 'YouTube', exact: true }).click();
    const download = sources.getByRole('button', { name: 'Download audio', exact: true });
    await expect(download).toBeEnabled();
    await download.click();
    await page.getByRole('button', { name: 'Downloads', exact: true }).click();
    const table = page.getByRole('table', { name: 'Tracks', exact: true });
    const soulseek = table.getByRole('row').filter({ hasText: 'Soulseek' });
    const youtube = table.getByRole('row').filter({ hasText: 'YouTube' });
    await expect(soulseek).toContainText('Waiting for peer');
    await expect(youtube).toContainText('Queued');
    await table.screenshot({ path: test.info().outputPath('waiting-and-queued.png') });
    await soulseek
      .getByRole('button', { name: 'Cancel download Quiet Orbit', exact: true })
      .click();
    await expect(soulseek).toContainText('Cancelled');
    await expect(
      youtube.getByRole('button', { name: 'Play Quiet Orbit', exact: true }),
    ).toBeEnabled();
    const saved = await page.evaluate(() => window.audioLibrary?.list());
    expect(saved).toMatchObject({ ok: true, value: [{ id: '12-abcdefghijk' }] });
  } finally {
    await desktop.close();
    await service.close();
  }
});
