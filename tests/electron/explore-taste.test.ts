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
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    const createCrate = async (name: string) => {
      await page.getByLabel('New crate name').fill(name);
      await page.getByRole('button', { name: 'Create crate', exact: true }).click();
      await expect(
        page.getByRole('combobox', { name: 'Active crate' }).locator('option:checked'),
      ).toHaveText(`${name} (0)`);
    };
    await createCrate('Deep picks');
    await createCrate('After hours');
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    const shelf = page.getByRole('region', { name: 'Discover records' });
    await shelf.getByRole('button', { name: /^(?!Play ).*Quiet Orbit EP/ }).click();
    const destination = page.getByRole('combobox', { name: 'Save to crate', exact: true });
    await expect(destination.locator('option:checked')).toHaveText('After hours (0)');
    await destination.selectOption({ label: 'Deep picks (0)' });
    await page.getByRole('button', { name: 'Save EP to crate' }).click();
    await expect(page.getByRole('button', { name: 'Saved to crate' })).toBeDisabled();
    await expect(destination.locator('option:checked')).toHaveText('Deep picks (1)');
    await destination.selectOption({ label: 'After hours (0)' });
    await expect(page.getByRole('button', { name: 'Save EP to crate' })).toBeEnabled();
    await page.getByRole('button', { name: 'Back to Explore' }).click();
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*Back Channel/ })).toBeVisible();
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*First Light/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*First Light/ })).toBeVisible();
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*Quiet Orbit EP/ })).toHaveCount(0);
  } finally {
    await desktop.close();
  }
});
