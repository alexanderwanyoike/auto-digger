import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse } from '../discogs-fixtures';

test('keeps Catalogue records visible and continues the interrupted page after a cooldown', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    const attempts = await desktop.evaluateHandle((_electron, identity) => {
      const state = { continuation: 0 };
      globalThis.fetch = (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname === '/oauth/identity') return Promise.resolve(Response.json(identity));
        const date = url.searchParams.get('year');
        const number = Number(url.searchParams.get('page'));
        const year = Math.max(1990, Number(date?.split('-')[0]) || 1990);
        if (date === '1990' && number === 2) {
          state.continuation += 1;
          if (state.continuation === 1)
            return Promise.resolve(
              new Response(null, { status: 429, headers: { 'Retry-After': '2' } }),
            );
        }
        const results = Array.from({ length: 50 }, (_, index) => ({
          id: year * 1_000 + number * 100 + index,
          title: `Page ${number.toString()} record ${index.toString()}`,
          year,
        }));
        return Promise.resolve(
          Response.json({
            pagination: {
              page: number,
              pages: date === '1990' ? 2 : 1,
              per_page: 50,
              items: date === '1990' ? 100 : 50,
            },
            results,
          }),
        );
      };
      return state;
    }, identityResponse);
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-discogs-cooldown');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Explore sections' })
      .getByRole('button', { name: 'Catalogue' })
      .click();
    const firstYear = page.getByRole('region', { name: '1990', exact: true });
    const firstRecord = firstYear.getByRole('button', {
      name: 'Play Page 1 record 0',
      exact: true,
    });
    await expect(firstRecord).toBeVisible();
    const viewport = page.locator('.explore-scroll');
    await viewport.evaluate((element) => {
      element.scrollTo(0, element.scrollHeight);
    });
    await expect(
      page.getByRole('status').filter({ hasText: 'Discogs is pausing new requests' }),
    ).toBeVisible();
    await expect(firstRecord).toBeAttached();
    expect(await attempts.evaluate((state) => state.continuation)).toBe(1);
    await expect(
      firstYear.getByRole('button', { name: 'Play Page 2 record 0', exact: true }),
    ).toBeAttached();
    await expect(firstRecord).toBeAttached();
    expect(await attempts.evaluate((state) => state.continuation)).toBe(2);
  } finally {
    await desktop.close();
  }
});
