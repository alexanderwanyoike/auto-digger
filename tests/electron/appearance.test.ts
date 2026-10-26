import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

[900, 1180].forEach((width) => {
  test(`selects visual appearance choices with the keyboard at ${width.toString()}px`, async () => {
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
      await page.setViewportSize({ width, height: 780 });
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      const appearance = page.getByRole('region', { name: 'Appearance settings' });
      const material = appearance.getByRole('group', { name: 'Material', exact: true });
      await expect(
        material.getByRole('radio', { name: 'Brushed aluminium', exact: true }),
      ).toBeChecked();
      await material.getByRole('radio', { name: 'Brushed aluminium', exact: true }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('html')).toHaveAttribute('data-material', 'ceramic');
      await expect(material.getByRole('radio', { name: 'Ceramic', exact: true })).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('html')).toHaveAttribute('data-material', 'slate');
      await material.getByRole('radio', { name: 'Warm paper', exact: true }).check();
      await expect(page.locator('html')).toHaveAttribute('data-material', 'paper');
      const accent = appearance.getByRole('group', { name: 'Accent colour' });
      await accent.getByRole('radio', { name: 'Rose', exact: true }).check();
      await expect(page.locator('html')).toHaveAttribute('data-accent', 'rose');
      const mode = appearance.getByRole('group', { name: 'Appearance mode' });
      await mode.getByRole('radio', { name: 'Dark', exact: true }).check();
      await expect(mode).toBeInViewport();
      await expect(accent).toBeInViewport();
      await expect(material).toBeInViewport();
      const previews = await appearance.locator('.material-thumbnail').evaluateAll((elements) =>
        elements.map((element) => ({
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
          surface: getComputedStyle(element).getPropertyValue('--surface').trim(),
        })),
      );
      expect(previews).toHaveLength(7);
      expect(previews.every((preview) => preview.width > 190 && preview.height >= 60)).toBe(true);
      expect(new Set(previews.map((preview) => preview.surface)).size).toBe(7);
      await page.screenshot({ path: `test-results/appearance-${width.toString()}-dark.png` });
      await mode.getByRole('radio', { name: 'Light', exact: true }).check();
      await page.screenshot({ path: `test-results/appearance-${width.toString()}-light.png` });
      await page.reload();
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await expect(material.getByRole('radio', { name: 'Warm paper', exact: true })).toBeChecked();
      await expect(accent.getByRole('radio', { name: 'Rose', exact: true })).toBeChecked();
      await expect(mode.getByRole('radio', { name: 'Light', exact: true })).toBeChecked();
      await page.emulateMedia({ colorScheme: 'dark' });
      await mode.getByRole('radio', { name: 'System', exact: true }).check();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.emulateMedia({ colorScheme: 'light' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    } finally {
      await desktop.close();
    }
  });
});
