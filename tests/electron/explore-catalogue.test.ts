import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogs-fixtures';

test('browses populated catalogue years and restores the timeline from a full year grid', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    await desktop.evaluate(
      (_electron, fixtures) => {
        globalThis.fetch = (input) => {
          const url = new URL(input instanceof Request ? input.url : input.toString());
          if (url.pathname === '/oauth/identity')
            return Promise.resolve(Response.json(fixtures.identityResponse));
          if (url.pathname === '/releases/12')
            return Promise.resolve(Response.json(fixtures.releaseResponse));
          const year = url.searchParams.get('year') ?? '';
          const range = year.split('-').map(Number);
          const matches = [
            { id: 14, title: 'Mira North - First Light', year: 1993 },
            ...Array.from({ length: 8 }, (_, index) => ({
              id: 20 + index,
              title: `Silt Relay - Back Channel ${index + 1}`,
              year: 2000,
            })),
          ];
          const results = year
            ? matches.filter(
                (record) =>
                  record.year >= Number(range[0]) && record.year <= Number(range[1] ?? range[0]),
              )
            : [{ id: 12, title: 'Low Tide - Quiet Orbit EP', year: 1998 }];
          return Promise.resolve(
            Response.json({
              pagination: { page: 1, pages: 1, per_page: 50, items: results.length },
              results,
            }),
          );
        };
      },
      { identityResponse, releaseResponse },
    );
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-explore-taste');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    const shelf = page.getByRole('region', { name: 'Discover records' });
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*Quiet Orbit EP/ })).toBeVisible();
    await page.getByRole('button', { name: 'Catalogue', exact: true }).click();
    const style = page.getByRole('combobox', { name: 'Style' });
    await style.fill('Progressive House');
    await page.getByRole('option', { name: 'Progressive House', exact: true }).click();
    const years = page.getByRole('navigation', { name: 'Release years' });
    await expect(years.getByRole('button', { name: '1993' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(years.getByRole('button', { name: '1994' })).toHaveCount(0);
    await years.getByRole('button', { name: '2000' }).click();
    await expect(page.getByRole('button', { name: /^(?!Play ).*Back Channel 1/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^(?!Play ).*Back Channel 8/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Show more' }).click();
    await expect(page.getByRole('button', { name: /^(?!Play ).*Back Channel 8/ })).toBeVisible();
    await page.getByRole('button', { name: 'Back to timeline' }).click();
    await expect(years.getByRole('button', { name: '2000' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.getByRole('button', { name: /^(?!Play ).*Back Channel 8/ })).toHaveCount(0);
  } finally {
    await desktop.close();
  }
});
