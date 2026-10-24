import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse } from '../discogsFixtures';

test('scopes styles by genre and submits only compatible selected styles through IPC', async () => {
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
    await desktop.evaluate((_electron, identity) => {
      globalThis.fetch = (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        const body =
          url.pathname === '/oauth/identity'
            ? identity
            : {
                pagination: { page: 1, pages: 1, per_page: 50, items: 1 },
                results: [
                  {
                    id: 12,
                    title: `${url.searchParams.get('genre') ?? 'Any genre'} / ${url.searchParams.get('style') ?? 'Any style'}`,
                    format: ['Album'],
                  },
                ],
              };
        return Promise.resolve(new Response(JSON.stringify(body)));
      };
    }, identityResponse);
    const page = await desktop.firstWindow();
    await page.setViewportSize({ width: 1180, height: 1000 });
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('genre-style-fixture');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    const genre = page.getByLabel('Genre', { exact: true });
    const style = page.getByLabel('Style', { exact: true });
    await genre.fill('Electronic');
    await page.getByRole('option', { name: 'Electronic', exact: true }).click();
    await style.fill('Deep House');
    await page.getByRole('option', { name: 'Deep House', exact: true }).click();
    await genre.fill('Hip Hop');
    await page.getByRole('option', { name: 'Hip Hop', exact: true }).click();
    await style.fill('Boom Bap');
    await page.getByRole('option', { name: 'Boom Bap', exact: true }).click();
    await style.press('Escape');
    await page.getByLabel('Remove Electronic', { exact: true }).click();
    await expect(page.getByLabel('Remove Deep House', { exact: true })).toHaveCount(0);
    await style.fill('Deep House');
    await expect(page.getByRole('option', { name: 'Deep House', exact: true })).toHaveCount(0);
    await expect(page.getByRole('option', { name: 'Use "Deep House"', exact: true })).toHaveCount(
      0,
    );
    await style.fill('');
    await style.press('Escape');
    await page.getByRole('button', { name: 'Search releases', exact: true }).click();
    const results = page.getByRole('region', { name: 'Matching releases' });
    await expect(results).toContainText('Hip Hop / Boom Bap');
    await genre.fill('Electronic');
    await page.getByRole('option', { name: 'Electronic', exact: true }).click();
    await style.fill('Deep House');
    await page.getByRole('option', { name: 'Deep House', exact: true }).click();
    await style.press('Escape');
    await page.getByRole('button', { name: 'Search releases', exact: true }).click();
    await expect(results).toContainText('Electronic|Hip Hop / Boom Bap|Deep House');
    await page.getByLabel('Remove Hip Hop', { exact: true }).click();
    await expect(page.getByLabel('Remove Boom Bap', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Remove Deep House', { exact: true })).toBeVisible();
    await genre.fill('Reggae');
    await page.getByRole('option', { name: 'Reggae', exact: true }).click();
    await style.fill('Roots Reggae');
    await page.getByRole('option', { name: 'Roots Reggae', exact: true }).click();
    await style.press('Escape');
    await page.getByLabel('Remove Electronic', { exact: true }).click();
    await expect(page.getByLabel('Remove Roots Reggae', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Remove Deep House', { exact: true })).toHaveCount(0);
    await page.getByLabel('Remove Reggae', { exact: true }).click();
    await expect(page.getByLabel('Remove Roots Reggae', { exact: true })).toBeVisible();
    await genre.fill('Hip Hop');
    await page.getByRole('option', { name: 'Hip Hop', exact: true }).click();
    await style.fill('');
    await style.click();
    await expect(page.getByRole('option', { name: 'Conscious', exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/genre-hip-hop-styles.png' });
  } finally {
    await desktop.close();
  }
});
