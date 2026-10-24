import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogsFixtures';

[900, 1920].forEach((width) => {
  test(`keeps long search summaries compact and aligned at ${width.toString()}px`, async () => {
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
      await desktop.evaluate(
        (_electron, fixtures) => {
          globalThis.fetch = (input) => {
            const url = new URL(input instanceof Request ? input.url : input.toString());
            let body: unknown = fixtures.identityResponse;
            if (url.pathname === '/database/search') {
              body = {
                pagination: { page: 1, pages: 1, per_page: 50, items: 18 },
                results: Array.from({ length: 18 }, (_, index) => ({
                  id: index + 12,
                  title:
                    index % 3 === 0
                      ? 'Low Tide - An Extended Journey Through The Quiet Orbit And Beyond'
                      : `Low Tide - Orbit ${index.toString()}${index % 3 === 1 ? 'x'.repeat(120) : ''}`,
                  year: '2003',
                  label:
                    index % 3 === 2
                      ? Array.from(
                          { length: 35 },
                          (_value, label) => `Long Publishing Company ${label.toString()}`,
                        )
                      : ['Still Records'],
                  format: ['Album'],
                  cover_image: 'https://i.discogs.com/layout-fixture.jpg',
                })),
              };
            } else if (url.pathname.startsWith('/releases/')) body = fixtures.releaseResponse;
            return Promise.resolve(new Response(JSON.stringify(body)));
          };
        },
        { identityResponse, releaseResponse },
      );
      const page = await desktop.firstWindow();
      await page.setViewportSize({ width, height: 1000 });
      await page.route('https://i.discogs.com/**', (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#bccddd"/><circle cx="150" cy="150" r="85" fill="#294f78"/></svg>',
        }),
      );
      await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
      await page.getByLabel('Personal token').fill('search-layout-fixture');
      await page.getByRole('button', { name: 'Connect account', exact: true }).click();
      await page.getByRole('button', { name: 'Search releases', exact: true }).click();
      const results = page.getByRole('region', { name: 'Matching releases' });
      await expect(results.getByRole('button')).toHaveCount(18);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const geometry = await results.locator('.search-result').evaluateAll((cards) =>
        cards.map((card) => {
          const cover = card.querySelector('.record-cover');
          const title = card.querySelector('strong');
          const summary = card.querySelector(':scope > span');
          if (!cover || !title || !summary) throw new Error('Missing search result content');
          return {
            height: card.getBoundingClientRect().height,
            coverHeight: cover.getBoundingClientRect().height,
            titleHeight: title.getBoundingClientRect().height,
            titleLine: parseFloat(getComputedStyle(title).lineHeight),
            summaryHeight: summary.getBoundingClientRect().height,
            summaryLine: parseFloat(getComputedStyle(summary).lineHeight),
          };
        }),
      );
      geometry.forEach((card) => {
        expect(
          card.height - card.coverHeight,
          'Summary must not stretch the result row',
        ).toBeLessThanOrEqual(110);
        expect(card.titleHeight).toBeLessThanOrEqual(card.titleLine * 2 + 1);
        expect(card.summaryHeight).toBeLessThanOrEqual(card.summaryLine * 2 + 1);
      });
      expect(
        Math.max(...geometry.map((card) => card.height)) -
          Math.min(...geometry.map((card) => card.height)),
      ).toBeLessThanOrEqual(1);
      const longTitle = results.locator('strong').first();
      const fullTitle = await longTitle.textContent();
      await expect(longTitle).toHaveAttribute('title', fullTitle ?? '');
      const longLabels = results.locator('.search-result > span').nth(2);
      await expect(longLabels).toContainText('Long Publishing Company 34');
      await expect(longLabels).toHaveAttribute('title', (await longLabels.textContent()) ?? '');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({ path: `test-results/search-summary-${width.toString()}-light.png` });
      await page.getByRole('button', { name: 'Dark', exact: true }).click();
      await page.screenshot({ path: `test-results/search-summary-${width.toString()}-dark.png` });
      await results.getByRole('button').first().click();
      await expect(
        page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true }),
      ).toBeVisible();
    } finally {
      await desktop.close();
    }
  });
});
