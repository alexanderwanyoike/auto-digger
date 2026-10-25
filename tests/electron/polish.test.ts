import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadedRelease } from '../discogsFixtures';

[900, 1180, 1600].forEach((width) => {
  test(`keeps transport beside track details and source rows compact at ${width.toString()}px`, async () => {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    );
    const desktop = await electron.launch({
      args: [
        resolve('tests/encryptedDesktop.cjs'),
        `--user-data-dir=${test.info().outputPath('polish-profile')}`,
      ],
      env,
    });
    try {
      const page = await desktop.firstWindow();
      await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
      await page.evaluate(async (release) => {
        await window.crate?.save(release);
        await window.audioLibrary?.download({ release, videoIndex: 0 });
      }, loadedRelease);
      await page.reload();
      await page.getByRole('button', { name: 'Open Quiet Orbit EP' }).click();
      await page.setViewportSize({ width, height: 780 });
      const player = page.getByRole('contentinfo', { name: 'Playback' });
      const info = await player.locator('.playing-info').boundingBox();
      const play = await player.getByRole('button', { name: 'Play', exact: true }).boundingBox();
      const seek = await player.getByRole('slider', { name: 'Track position' }).boundingBox();
      if (!info || !play || !seek) throw new Error('Player controls are missing');
      expect(play.x - (info.x + info.width)).toBeLessThanOrEqual(20);
      expect(seek.x - (play.x + play.width)).toBeLessThanOrEqual(64);
      const row = page.getByRole('region', { name: 'Audio sources' }).getByRole('listitem');
      const box = await row.boundingBox();
      expect(box?.height).toBeLessThanOrEqual(136);
      await expect(row.getByText('YouTube video')).toBeVisible();
      await expect(row.getByLabel('Discogs track')).toHaveValue('0');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expect(player).toBeInViewport();
      await page.screenshot({
        path: `test-results/polish-${width.toString()}-light.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Dark', exact: true }).click();
      await page.screenshot({
        path: `test-results/polish-${width.toString()}-dark.png`,
        fullPage: true,
      });
    } finally {
      await desktop.close();
    }
  });
});

test('keeps source controls and row positions fixed while a download reports progress', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encryptedDesktop.cjs'),
      `--user-data-dir=${test.info().outputPath('progress-profile')}`,
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
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.evaluate(async (release) => window.crate?.save(release), {
      ...loadedRelease,
      videos: [
        { title: 'Quiet Orbit', url: 'https://youtu.be/slowvideo01' },
        { title: 'Alternative', url: 'https://youtu.be/abcdefghijk' },
      ],
    });
    await page.reload();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP' }).click();
    const rows = page.getByRole('list', { name: 'YouTube audio sources' }).getByRole('listitem');
    await expect(rows).toHaveCount(2);
    const first = rows.nth(0);
    const second = rows.nth(1);
    const control = first.locator('.source-download');
    await expect(control).toHaveAccessibleName('Download audio');
    await expect(second.getByRole('button', { name: 'Download audio' })).toBeEnabled();
    await control.scrollIntoViewIfNeeded();
    const positions = () =>
      Promise.all([
        first.boundingBox(),
        second.boundingBox(),
        first.getByLabel('Discogs track').boundingBox(),
        control.boundingBox(),
      ]);
    const before = await positions();
    await control.click();
    await expect(
      page.getByRole('progressbar', { name: 'Progress for Quiet Orbit', exact: true }),
    ).toBeVisible();
    const after = await positions();
    before.forEach((box, index) => {
      const current = after[index];
      if (!box || !current) throw new Error('Source controls disappeared');
      expect(Math.abs(current.y - box.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(current.width - box.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(current.height - box.height)).toBeLessThanOrEqual(1);
    });
    await expect(control).toContainText('25%');
    await page.screenshot({ path: '/tmp/auto-digger-source-progress.png' });
    await page.getByRole('button', { name: 'Cancel download Quiet Orbit', exact: true }).click();
  } finally {
    await desktop.close();
  }
});
