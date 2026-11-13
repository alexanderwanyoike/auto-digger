import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogs-fixtures';

test('learns the saved record style when the listener refreshes Explore', async () => {
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
          const results =
            url.searchParams.get('style') === 'Deep House'
              ? [{ id: 14, title: 'Mira North - First Light', year: 1993 }]
              : [
                  { id: 12, title: 'Low Tide - Quiet Orbit EP', year: 1998 },
                  { id: 15, title: 'Silt Relay - Back Channel', year: 2007 },
                ];
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
    await shelf.getByRole('button', { name: /Quiet Orbit EP/ }).click();
    await page.getByRole('button', { name: 'Save EP to crate' }).click();
    await expect(page.getByRole('button', { name: 'Saved to crate' })).toBeDisabled();
    await page.getByRole('button', { name: 'Back to Explore' }).click();
    await expect(shelf.getByRole('button', { name: /Back Channel/ })).toBeVisible();
    await expect(shelf.getByRole('button', { name: /First Light/ })).toHaveCount(0);
    await shelf.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(shelf.getByRole('button', { name: /First Light/ })).toBeVisible();
    await expect(shelf.getByRole('button', { name: /Quiet Orbit EP/ })).toHaveCount(0);
  } finally {
    await desktop.close();
  }
});
