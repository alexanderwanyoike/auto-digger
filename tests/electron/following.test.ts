import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogs-fixtures';

test('follows artists, labels and genres and manages them after restarting', async () => {
  const options = {
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      AUTO_DIGGER_TEST_IDENTITY: '1',
    },
  };
  let desktop = await electron.launch(options);
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.setViewportSize({ width: 1280, height: 920 });
    await desktop.evaluate(
      (_electron, fixtures) => {
        globalThis.fetch = (input) => {
          const url = new URL(input instanceof Request ? input.url : input.toString());
          return Promise.resolve(
            Response.json(
              url.pathname === '/oauth/identity'
                ? fixtures.identityResponse
                : fixtures.releaseResponse,
            ),
          );
        };
      },
      { identityResponse, releaseResponse },
    );
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-following-token');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await page.getByLabel('Discogs release ID', { exact: true }).fill('12');
    await page.getByRole('button', { name: 'Load release', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toBeVisible();

    const artist = page.getByRole('button', { name: 'Follow artist Low Tide', exact: true });
    await artist.click();
    await expect(artist).toHaveAttribute('aria-pressed', 'true');
    const label = page.getByRole('button', { name: 'Follow label Still Records', exact: true });
    await label.click();
    await expect(label).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('combobox', { name: 'Genre', exact: true }).fill('Electronic');
    await page.getByRole('option', { name: 'Electronic', exact: true }).click();
    await page.getByRole('combobox', { name: 'Genre', exact: true }).press('Escape');
    const genre = page.getByRole('button', { name: 'Follow genre Electronic', exact: true });
    await genre.click();
    await expect(genre).toHaveAttribute('aria-pressed', 'true');

    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    const following = page.getByRole('region', { name: 'Following', exact: true });
    await expect(following.getByText('Low Tide', { exact: true })).toBeVisible();
    await expect(following.getByText('Still Records', { exact: true })).toBeVisible();
    await expect(following.getByText('Electronic', { exact: true })).toBeVisible();
    await following
      .getByRole('button', { name: 'Unfollow label Still Records', exact: true })
      .click();
    await expect(following.getByText('Still Records', { exact: true })).toHaveCount(0);
    await expect(following.getByText('Low Tide', { exact: true })).toBeVisible();
  } finally {
    await desktop.close();
  }
});
