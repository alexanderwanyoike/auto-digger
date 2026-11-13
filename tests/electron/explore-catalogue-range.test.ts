import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse } from '../discogs-fixtures';

test('browses a year range with one paginated search and opens an individual year', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    const requests = await desktop.evaluateHandle((_electron, identity) => {
      const searches: { year: string; page: number; style: string; sort: string; order: string }[] =
        [];
      globalThis.fetch = (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname === '/oauth/identity') return Promise.resolve(Response.json(identity));
        const year = url.searchParams.get('year') ?? '';
        const number = Number(url.searchParams.get('page')) || 1;
        const style = url.searchParams.get('style') ?? '';
        const sort = url.searchParams.get('sort') ?? '';
        const order = url.searchParams.get('sort_order') ?? '';
        if (year) searches.push({ year, page: number, style, sort, order });
        const records = (date: number, count: number) =>
          Array.from({ length: count }, (_, index) => ({
            id: date * 100 + index,
            title: `Record ${date.toString()} ${index.toString()}`,
            year: date,
          }));
        const capped = year === '1993-2001';
        const ranged = year === '1993-1999' || capped;
        const rangePages = [
          records(1993, 50),
          records(1992, 50),
          [...records(1993, 1), ...records(1994, 1), ...records(1995, 1), ...records(2000, 1)],
        ];
        const results = ranged
          ? (rangePages[number - 1] ?? []).map((record) =>
              record.year === 1992 ? { ...record, year: '' } : record,
            )
          : records(Number(year.split('-')[0]) || 1990, 1);
        return Promise.resolve(
          Response.json({
            pagination: {
              page: number,
              pages: capped ? 250 : rangePages.length,
              per_page: 50,
              items: capped ? 12500 : 104,
            },
            results,
          }),
        );
      };
      return searches;
    }, identityResponse);
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-catalogue-range');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Explore sections' })
      .getByRole('button', {
        name: 'Catalogue',
      })
      .click();
    const years = page.getByRole('navigation', { name: 'Release years' });
    await expect(years.getByRole('button', { name: '1001', exact: true })).toBeVisible();

    const from = page.getByRole('textbox', { name: 'From year' });
    const to = page.getByRole('textbox', { name: 'To year' });
    await expect(from).toBeVisible({ timeout: 3000 });
    const before = (await requests.jsonValue()).length;
    const rangeRequests = async () => (await requests.jsonValue()).slice(before);
    await from.fill('1993');
    await to.fill('1992');
    await to.press('Enter');
    await expect(page.getByRole('alert')).toHaveText(
      'To year must be the same as or later than From year.',
    );
    expect(await rangeRequests()).toEqual([]);

    await to.fill('1999');
    await to.press('Enter');
    const first = page.getByRole('region', { name: '1993', exact: true });
    const second = page.getByRole('region', { name: '1995', exact: true });
    const query = { year: '1993-1999', style: 'Progressive House', sort: 'year', order: 'asc' };
    await expect(first.getByRole('button', { name: 'Play Record 1993 49' })).toBeAttached();
    await expect(years.getByRole('button')).toHaveText(['1993']);
    expect(await rangeRequests()).toEqual([{ ...query, page: 1 }]);

    await page.locator('.explore-scroll').evaluate((viewport) => {
      viewport.scrollTo(0, viewport.scrollHeight);
    });
    await expect(second.getByRole('button', { name: 'Play Record 1995 0' })).toBeVisible();
    await expect(years.getByRole('button')).toHaveText(['1993', '1994', '1995']);
    await expect(
      first.getByRole('button', { name: 'Play Record 1993 0', exact: true }),
    ).toHaveCount(1);
    expect(await rangeRequests()).toEqual([1, 2, 3].map((number) => ({ ...query, page: number })));

    await years.getByRole('button', { name: '1995', exact: true }).click();
    await page.evaluate(
      () =>
        new Promise((done) => {
          requestAnimationFrame(() => requestAnimationFrame(done));
        }),
    );
    await expect(years.getByRole('button', { name: '1995', exact: true })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await years.getByRole('button', { name: '1993', exact: true }).click();
    await years.getByRole('button', { name: '1994', exact: true }).click();
    await page.evaluate(
      () =>
        new Promise((done) => {
          requestAnimationFrame(() => requestAnimationFrame(done));
        }),
    );
    await expect(years.getByRole('button', { name: '1994', exact: true })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await second.getByRole('button', { name: 'Show more' }).click();
    await expect(page.getByRole('heading', { name: '1995', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play Record 1995 0' })).toBeVisible();
    expect((await rangeRequests()).at(-1)).toMatchObject({ year: '1995', page: 1 });
    await page.getByRole('button', { name: 'Back to Catalogue' }).click();
    await expect(to).toHaveValue('1999');
    await expect(second.getByRole('button', { name: 'Play Record 1995 0' })).toBeAttached();

    await to.fill('2001');
    await to.press('Enter');
    await expect(
      page.getByText(
        'Discogs shows the first 10,000 matches. Narrow the year range to see later releases.',
      ),
    ).toBeVisible();
  } finally {
    await desktop.close();
  }
});
