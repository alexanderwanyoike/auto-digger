import { _electron as electron, expect, test } from '@playwright/test';

test('opens an isolated desktop window and retains a chosen theme after reload', async () => {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  const desktop = await electron.launch({ args: ['.'], env: environment });
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
  } finally {
    await desktop.close();
  }
});
