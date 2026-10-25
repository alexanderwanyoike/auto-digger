import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { selectAppearance } from '../appearance';
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
      await selectAppearance(page, 'Dark');
      await page.screenshot({
        path: `test-results/polish-${width.toString()}-dark.png`,
        fullPage: true,
      });
    } finally {
      await desktop.close();
    }
  });
});
