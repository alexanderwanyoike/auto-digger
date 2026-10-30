import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';

[1180, 900].forEach((width) => {
  test(`keeps source controls steady while checking at ${width.toString()}px`, async () => {
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
        AUTO_DIGGER_TEST_PROBE_DELAY: '3000',
      },
    });
    try {
      const page = await desktop.firstWindow();
      await page.setViewportSize({ width, height: 860 });
      await page.evaluate((release) => window.crate?.save(release), loadedRelease);
      await page.reload();
      await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
      const download = page.getByRole('button', { name: 'Download audio', exact: true });
      const spinner = download.getByRole('progressbar', { name: 'Checking audio availability' });
      await expect(spinner).toBeVisible();
      await expect(download).toBeDisabled();
      await expect(page.getByText('Checking…', { exact: true })).toHaveCount(0);
      const assignment = page
        .getByRole('list', { name: 'YouTube audio sources', exact: true })
        .getByRole('combobox');
      const preview = page.getByRole('button', { name: 'Preview audio', exact: true });
      const before = await Promise.all([
        assignment.boundingBox(),
        preview.boundingBox(),
        download.boundingBox(),
      ]);
      expect(await spinner.evaluate((element) => element.getAnimations().length)).toBe(1);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect(await spinner.evaluate((element) => getComputedStyle(element).animationName)).toBe(
        'none',
      );
      await page.screenshot({ path: test.info().outputPath('checking.png') });
      await expect(download).toBeEnabled();
      await expect(spinner).toHaveCount(0);
      expect(
        await Promise.all([
          assignment.boundingBox(),
          preview.boundingBox(),
          download.boundingBox(),
        ]),
      ).toEqual(before);
      await page.screenshot({ path: test.info().outputPath('ready.png') });
      await preview.click();
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    } finally {
      await desktop.close();
    }
  });
});
