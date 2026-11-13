import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse } from '../discogs-fixtures';

[1, 50].forEach((size) => {
  test(`loads a style with ${size.toString()} records per year within the request budget`, async () => {
    const desktop = await electron.launch({
      args: [
        resolve('tests/encrypted-desktop.cjs'),
        `--user-data-dir=${test.info().outputPath('profile')}`,
      ],
    });
    try {
      const page = await desktop.firstWindow();
      const requests = await desktop.evaluateHandle(
        (_electron, { identity, size: count }) => {
          const searches: { style: string; date: string }[] = [];
          globalThis.fetch = (input) => {
            const url = new URL(input instanceof Request ? input.url : input.toString());
            if (url.pathname === '/oauth/identity') return Promise.resolve(Response.json(identity));
            const style = url.searchParams.get('style') ?? '';
            const date = url.searchParams.get('year');
            if (date) searches.push({ style, date });
            const start = Math.max(1990, Number(date?.split('-')[0]) || 1990);
            const end = Number(date?.split('-')[1]) || start;
            let year = start;
            if (url.searchParams.get('sort_order') === 'desc') year = Math.min(2003, end);
            else if (start === 2006 && date?.includes('-')) year = 2007;
            const results = Array.from({ length: date === '2006' ? 0 : count }, (_, index) => ({
              id: year * 100 + index,
              title: `${style} record ${index.toString()}`,
              year,
            }));
            return Promise.resolve(
              Response.json({
                pagination: { page: 1, pages: 1, per_page: 50, items: results.length },
                results,
              }),
            );
          };
          return searches;
        },
        { identity: identityResponse, size },
      );
      const requestsFor = (style: string) =>
        requests.evaluate(
          (searches, name) => searches.filter((item) => item.style === name).length,
          style,
        );
      await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
      await page.getByLabel('Personal token').fill('fixture-catalogue-budget');
      await page.getByRole('button', { name: 'Connect account', exact: true }).click();
      const navigation = page.getByRole('navigation', { name: 'Explore sections' });
      await navigation.getByRole('button', { name: 'Catalogue' }).click();
      const firstYear = page.getByRole('region', { name: '1990', exact: true });
      const years = page.getByRole('navigation', { name: 'Release years' });
      await expect(firstYear).toBeVisible();
      await expect(years.getByRole('button', { name: '1991' })).toBeVisible();
      await expect.poll(() => requestsFor('Progressive House')).toBe(3);
      await expect(years.getByRole('button', { name: '1992' })).toHaveCount(0);
      const style = page.getByRole('combobox', { name: 'Style' });
      await style.fill('Techno');
      await page.getByRole('option', { name: 'Techno', exact: true }).click();
      await expect(firstYear.getByRole('button', { name: 'Play Techno record 0' })).toBeVisible();
      await style.fill('Progressive House');
      await page.getByRole('option', { name: 'Progressive House', exact: true }).click();
      await expect(
        firstYear.getByRole('button', { name: 'Play Progressive House record 0' }),
      ).toBeVisible();
      await expect.poll(() => requestsFor('Progressive House')).toBe(3);
      await expect(years.getByRole('button', { name: '1992' })).toHaveCount(0);
      if (size === 1) {
        await navigation.getByRole('button', { name: 'Catalogue' }).press('PageDown');
        await expect(
          firstYear.getByRole('button', { name: 'Play Progressive House record 0' }),
        ).toBeVisible();
        await expect(page.getByRole('region', { name: '1991', exact: true })).toBeVisible();
      }
      await years.hover();
      await page.mouse.wheel(0, 180);
      await expect(years.getByRole('button', { name: '1992' })).toBeVisible();
      await years.getByRole('button', { name: '1992' }).click();
      await expect(page.getByRole('region', { name: '1992', exact: true })).toBeVisible();
      const yearInput = page.getByRole('textbox', { name: 'Jump to year' });
      const before = (await requests.jsonValue()).length;
      await yearInput.fill('2005');
      await yearInput.press('Enter');
      const jumped = page.getByRole('region', { name: '2005', exact: true });
      await expect(jumped).toBeVisible();
      await expect(years.getByRole('button', { name: '2003', exact: true })).toBeVisible();
      await expect(years.getByRole('button', { name: '2007', exact: true })).toBeVisible();
      const jumpSearches = (await requests.jsonValue())
        .slice(before)
        .map(({ date }) => date)
        .filter((date) => date !== '1993' && date !== '1993-9999');
      expect(jumpSearches.sort()).toEqual(['1000-2004', '2005', '2006-9999']);
      await years.getByRole('button', { name: '2007' }).click();
      await expect(page.getByRole('region', { name: '2007', exact: true })).toBeVisible();
      await yearInput.press('Enter');
      await expect(jumped).toBeVisible();
      await yearInput.fill('2006');
      await yearInput.press('Enter');
      await expect(page.getByText('No releases found for 2006.')).toBeVisible();
      await years.getByRole('button', { name: '2007', exact: true }).click();
      await expect(page.getByRole('region', { name: '2007', exact: true })).toBeVisible();
      await expect(years.getByRole('button', { name: '2006', exact: true })).toHaveCount(0);
    } finally {
      await desktop.close();
    }
  });
});
