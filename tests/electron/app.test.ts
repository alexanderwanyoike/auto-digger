import { _electron as electron, expect, test } from '@playwright/test';

[900, 1180].forEach((width) => {
  test(`desktop desk opens safely, remembers appearance and fits ${width}x780`, async () => {
    const environment = Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    );
    const desktop = await electron.launch({
      args: [`--user-data-dir=${test.info().outputPath('profile')}`, '.'],
      env: environment,
    });
    try {
      const page = await desktop.firstWindow();
      await expect(page.getByRole('heading', { name: 'Digging desk' })).toBeVisible();
      expect(await page.evaluate(() => 'require' in window || 'process' in window)).toBe(false);
      await page.getByRole('button', { name: 'Dark', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.reload();
      await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.getByRole('button', { name: 'Light', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      const popup = await page.evaluate(() => window.open('https://example.com'));
      expect(popup).toBeNull();
      expect(desktop.windows()).toHaveLength(1);
      await page.setViewportSize({ width, height: 780 });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const layout = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }));
      expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth);
      expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight);
      await expect(page.getByText('Built for the long way round.')).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: `test-results/phase-1-${width}-light.png`, fullPage: true });
      await page.getByRole('button', { name: 'Dark', exact: true }).click();
      await page.screenshot({ path: `test-results/phase-1-${width}-dark.png`, fullPage: true });
    } finally {
      await desktop.close();
    }
  });
});
