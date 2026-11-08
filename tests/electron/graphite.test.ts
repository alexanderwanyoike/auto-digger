import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { selectAppearance } from '../appearance';

test('opens with rounded matte surfaces in light and dark mode', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    await page.setViewportSize({ width: 900, height: 780 });
    await expect(page.locator('html')).toHaveAttribute('data-material', 'graphite');
    const banner = page.getByRole('banner');
    const navigation = page.getByRole('navigation', { name: 'Main sections' });
    const playback = page.getByRole('contentinfo', { name: 'Playback' });
    const filters = page.getByRole('complementary', { name: 'The starting point' });
    const release = page.getByRole('region', { name: 'Your next find starts here.', exact: true });
    const crate = page.getByRole('complementary', { name: 'Your crate' });

    await (['Dark', 'Light'] as const).reduce<Promise<void>>(
      (previous, mode) =>
        previous.then(async () => {
          await selectAppearance(page, mode);
          await Promise.all(
            [banner, navigation, playback, filters, release, crate].map((surface) =>
              expect(surface).toHaveCSS('background-image', 'none'),
            ),
          );
          await Promise.all(
            [filters, release, crate].map((pane) =>
              expect(pane).toHaveCSS('border-radius', '12px'),
            ),
          );
          const header = await banner.boundingBox();
          const tabs = await navigation.boundingBox();
          if (!header || !tabs) throw new Error('Missing desktop navigation');
          expect(tabs.y).toBeGreaterThanOrEqual(header.y + header.height);
        }),
      Promise.resolve(),
    );
  } finally {
    await desktop.close();
  }
});
