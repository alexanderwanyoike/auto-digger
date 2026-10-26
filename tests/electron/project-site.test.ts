import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { preview } from 'vite';
import siteConfig from '../../site.vite.config';

[390, 1280].forEach((width) => {
  test(`project site is readable and navigable at ${width.toString()}px`, async () => {
    const server = await preview({ ...siteConfig, preview: { host: '127.0.0.1', port: 0 } });
    const address = server.resolvedUrls?.local[0];
    if (!address) throw new Error('Site preview did not start');
    const desktop = await electron.launch({
      args: [
        resolve('tests/site-desktop.cjs'),
        `--user-data-dir=${test.info().outputPath('profile')}`,
        address,
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
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('heading', { name: 'Auto Digger', exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
      ).toBe('dark');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await expect
        .poll(() =>
          page
            .locator('img')
            .evaluateAll((elements) =>
              elements.every(
                (element) =>
                  element instanceof HTMLImageElement &&
                  element.complete &&
                  element.naturalWidth > 0,
              ),
            ),
        )
        .toBe(true);
      await page.getByRole('link', { name: 'Skip to content', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
      await page.screenshot({ path: `test-results/project-site-${width.toString()}.png` });
      const navigation = page.getByRole('navigation', { name: 'Main navigation' });
      await navigation.getByRole('link', { name: 'MCP', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Mix research with MCP', exact: true }),
      ).toBeInViewport();
      await navigation.getByRole('link', { name: 'Downloads', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Downloads', exact: true })).toBeInViewport();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.getByRole('link', { name: 'macOS install help', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'macOS installation', exact: true }),
      ).toBeInViewport();
      await page.getByRole('link', { name: 'Skip to content', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('main')).toBeFocused();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({ path: `test-results/setup-${width.toString()}.png` });
      const contents = page.getByRole('navigation', { name: 'On this page' });
      await contents.getByRole('link', { name: 'Codex', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Codex', exact: true })).toBeInViewport();
      await page.getByText('Codex configuration file', { exact: true }).click();
      const command = page.getByRole('region', { name: 'Codex MCP registration', exact: true });
      await command.focus();
      if (width === 390) {
        await page.keyboard.press('ArrowRight');
        await expect
          .poll(() => command.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await contents.getByRole('link', { name: 'Claude Desktop', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Claude Desktop', exact: true }),
      ).toBeInViewport();
    } finally {
      await desktop.close();
      await new Promise<void>((done) => {
        server.httpServer.close(() => {
          done();
        });
      });
    }
  });
});
