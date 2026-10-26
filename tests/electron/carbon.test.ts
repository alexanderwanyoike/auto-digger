import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('uses flat dark panels and black framing for Carbon, then restores the saved material', async () => {
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
    await page.getByRole('radio', { name: 'Dark', exact: true }).check();
    await page.getByRole('radio', { name: 'Carbon', exact: true }).check();
    await expect(page.locator('html')).toHaveAttribute('data-material', 'carbon');
    await expect(page.locator('.app-header')).toHaveCSS('background-image', 'none');
    await expect(page.locator('.app-header')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await expect(page.locator('.playback-bar')).toHaveCSS('background-image', 'none');
    await expect(page.locator('.playback-bar')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await expect(page.locator('.filter-panel')).toHaveCSS('background-color', 'rgb(17, 17, 17)');
    await expect(page.locator('.filter-panel')).toHaveCSS('border-radius', '8px');
    await expect(page.locator('.workspace')).toHaveCSS('column-gap', '8px');
    await page.screenshot({ path: 'test-results/carbon-dark.png' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-material', 'carbon');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('radio', { name: 'Light', exact: true }).check();
    await expect(page.locator('html')).toHaveAttribute('data-material', 'carbon');
    await page.screenshot({ path: 'test-results/carbon-light.png' });
  } finally {
    await desktop.close();
  }
});
