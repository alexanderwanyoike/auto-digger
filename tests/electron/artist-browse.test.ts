import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogs-fixtures';

test('returns from repeated artist browsing and digging without repeating the original EP', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
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
    const page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk', exact: true }).waitFor();
    await desktop.evaluate(
      (_electron, fixtures) => {
        globalThis.fetch = (input) => {
          const url = new URL(input instanceof Request ? input.url : input.toString());
          if (url.pathname === '/oauth/identity')
            return Promise.resolve(Response.json(fixtures.identityResponse));
          if (url.pathname === '/database/search') {
            const artist = url.searchParams.get('artist');
            const id = artist === 'Low Tide' ? 13 : 12;
            return Promise.resolve(
              Response.json({
                pagination: { page: 1, pages: 1, per_page: 50, items: 1 },
                results: [
                  {
                    id,
                    title: id === 13 ? 'Still Waters - Later EP' : 'Low Tide - Quiet Orbit EP',
                  },
                ],
              }),
            );
          }
          const id = Number(url.pathname.split('/').at(-1));
          return Promise.resolve(
            Response.json({
              ...fixtures.releaseResponse,
              id,
              title: id === 13 ? 'Later EP' : 'Quiet Orbit EP',
              artists: [{ name: id === 13 ? 'Still Waters' : 'Low Tide' }],
            }),
          );
        };
      },
      { identityResponse, releaseResponse },
    );
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('synthetic-artist-test-token');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await page.getByLabel('Label', { exact: true }).fill('Still Records');
    await page.getByLabel('Year', { exact: true }).fill('1998');
    await page.getByRole('button', { name: 'Search releases', exact: true }).click();
    await page.getByRole('button', { name: 'Dig a random release', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Browse releases by Low Tide', exact: true }).click();
    await page.getByRole('button', { name: /Still Waters - Later EP/ }).click();
    await page
      .getByRole('button', { name: 'Browse releases by Still Waters', exact: true })
      .click();
    await page.getByRole('button', { name: 'Dig a random release', exact: true }).click();
    await page.getByRole('button', { name: 'Back to Quiet Orbit EP', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toBeVisible();
    await expect(page.getByLabel('Label', { exact: true })).toHaveValue('Still Records');
    await expect(page.getByLabel('Year', { exact: true })).toHaveValue('1998');
    await page.getByRole('button', { name: 'Dig again', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('No unseen releases remain');
  } finally {
    await desktop.close();
  }
});
