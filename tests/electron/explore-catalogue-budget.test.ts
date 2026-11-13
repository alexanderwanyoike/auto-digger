import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse } from '../discogs-fixtures';

test('loads a style with three searches and reuses the pages on return', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    const requests = await desktop.evaluateHandle((_electron, identity) => {
      const searches: string[] = [];
      globalThis.fetch = (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname === '/oauth/identity') return Promise.resolve(Response.json(identity));
        const style = url.searchParams.get('style') ?? '';
        const date = url.searchParams.get('year');
        if (date) searches.push(style);
        const year = Math.max(1990, Number(date?.split('-')[0]) || 1990);
        const results = Array.from({ length: 50 }, (_, index) => ({
          id: year * 100 + index,
          title: `${style} record ${index.toString()}`,
          year,
        }));
        return Promise.resolve(
          Response.json({ pagination: { page: 1, pages: 1, per_page: 50, items: 50 }, results }),
        );
      };
      return searches;
    }, identityResponse);
    const requestsFor = (style: string) =>
      requests.evaluate((searches, name) => searches.filter((item) => item === name).length, style);
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-catalogue-budget');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    const navigation = page.getByRole('navigation', { name: 'Explore sections' });
    await navigation.getByRole('button', { name: 'Catalogue' }).click();
    const firstYear = page.getByRole('region', { name: '1990', exact: true });
    const years = page.getByRole('navigation', { name: 'Release years' });
    await expect(firstYear).toBeVisible();
    await expect(years.getByRole('button', { name: '1991' })).toBeVisible();
    await expect.poll(() => requestsFor('Progressive House')).toBeLessThanOrEqual(3);
    const style = page.getByRole('combobox', { name: 'Style' });
    await style.fill('Techno');
    await page.getByRole('option', { name: 'Techno', exact: true }).click();
    await expect(firstYear.getByRole('button', { name: 'Play Techno record 0' })).toBeVisible();
    await style.fill('Progressive House');
    await page.getByRole('option', { name: 'Progressive House', exact: true }).click();
    await expect(
      firstYear.getByRole('button', { name: 'Play Progressive House record 0' }),
    ).toBeVisible();
    await expect.poll(() => requestsFor('Progressive House')).toBeLessThanOrEqual(3);
    await years.hover();
    await page.mouse.wheel(0, 180);
    await expect(years.getByRole('button', { name: '1992' })).toBeVisible();
    await years.getByRole('button', { name: '1992' }).click();
    await expect(page.getByRole('region', { name: '1992', exact: true })).toBeVisible();
  } finally {
    await desktop.close();
  }
});
