import { selectAppearance } from '../appearance';
import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { contrast } from '../contrast';

(['Light', 'Dark'] as const).forEach((mode) => {
  test(`renders neutral satin aluminium with fine grain in ${mode.toLowerCase()} mode`, async () => {
    const desktop = await electron.launch({
      args: [
        resolve('tests/encryptedDesktop.cjs'),
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
      await selectAppearance(page, mode);
      await expect(page.locator('html')).toHaveAttribute('data-material', 'aluminium');
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await Promise.all(
        ['.app-header', '.playback-bar'].map(async (selector) => {
          const { data, info } = await sharp(
            await page.locator(selector).screenshot({ scale: 'css' }),
          )
            .extract({ left: 8, top: 10, width: 12, height: 40 })
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          let brightness = 0;
          let tint = 0;
          let grain = 0;
          const background = [0, 0, 0];
          for (let y = 0; y < info.height; y += 1) {
            for (let x = 0; x < info.width; x += 1) {
              const offset = (y * info.width + x) * info.channels;
              const red = data[offset] ?? 0;
              const green = data[offset + 1] ?? 0;
              const blue = data[offset + 2] ?? 0;
              background[0] = (background[0] ?? 0) + red;
              background[1] = (background[1] ?? 0) + green;
              background[2] = (background[2] ?? 0) + blue;
              brightness += (red + green + blue) / 3;
              tint += Math.max(red, green, blue) - Math.min(red, green, blue);
              if (x > 0) grain += Math.abs(red - (data[offset - info.channels] ?? 0));
            }
          }
          const pixels = info.width * info.height;
          const surface = `#${background
            .map((channel) =>
              Math.round(channel / pixels)
                .toString(16)
                .padStart(2, '0'),
            )
            .join('')}`;
          const muted = await page
            .locator(selector)
            .evaluate((element) => getComputedStyle(element).getPropertyValue('--muted').trim());
          expect(
            contrast(muted, surface),
            `${selector}: small text on painted metal`,
          ).toBeGreaterThanOrEqual(4.5);
          expect(tint / pixels, `${selector}: neutral metal`).toBeLessThanOrEqual(4);
          expect(brightness / pixels, `${selector}: silver or space grey`).toBeGreaterThan(
            mode === 'Light' ? 190 : 40,
          );
          expect(brightness / pixels, `${selector}: restrained reflection`).toBeLessThan(
            mode === 'Light' ? 230 : 85,
          );
          expect(
            grain / pixels,
            `${selector}: speckled finish rather than ruled stripes`,
          ).toBeGreaterThan(0.05);
          expect(grain / pixels, `${selector}: quiet texture`).toBeLessThan(3);
        }),
      );
      await page.screenshot({ path: `test-results/aluminium-${mode.toLowerCase()}-desk.png` });
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      const preview = page.locator('.material-thumbnail[data-material="aluminium"]');
      const expected = await page.locator('.app-header').evaluate((element) => ({
        image: getComputedStyle(element).backgroundImage,
        size: getComputedStyle(element).backgroundSize,
      }));
      await expect(preview.locator('.material-mini-header')).toHaveCSS(
        'background-image',
        expected.image,
      );
      await expect(preview.locator('.material-mini-header')).toHaveCSS(
        'background-size',
        expected.size,
      );
      await page.screenshot({ path: `test-results/aluminium-${mode.toLowerCase()}-settings.png` });
    } finally {
      await desktop.close();
    }
  });
});
