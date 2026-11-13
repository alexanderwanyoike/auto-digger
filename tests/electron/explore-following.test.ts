import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { releaseResponse } from '../discogs-fixtures';

test('discovers unopened releases, browses followed catalogues and compares genre years', async () => {
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
  const stubCatalogue = () =>
    desktop.evaluate((_electron, record) => {
      const identity = globalThis.fetch;
      globalThis.fetch = (input, init) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname === '/oauth/identity') return identity(input, init);
        if (url.pathname.startsWith('/releases/')) {
          const id = Number(url.pathname.split('/').at(-1));
          return Promise.resolve(
            Response.json({ ...record, id, title: id === 12 ? 'Quiet Orbit EP' : 'Night Transit' }),
          );
        }
        const year = url.searchParams.get('year');
        const artist = url.searchParams.get('artist');
        const page = Number(url.searchParams.get('page'));
        const records = [
          { id: 12, title: 'Low Tide - Quiet Orbit EP', year: 1998 },
          { id: 13, title: 'Low Tide - Night Transit', year: 1999 },
          { id: 14, title: 'Mira North - First Light', year: 1993 },
          { id: 15, title: 'Still Waters - Late Signal', year: 2000 },
        ];
        const catalogue = artist ? records.slice(0, 2) : records;
        const results = year
          ? catalogue.filter((release) => release.year.toString() === year)
          : catalogue;
        return Promise.resolve(
          Response.json({
            pagination: { page, pages: 1, per_page: 50, items: results.length },
            results,
          }),
        );
      };
    }, releaseResponse);
  try {
    let page = await desktop.firstWindow();
    await stubCatalogue();
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-explore-token');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }),
    ).toBeVisible();
    const seeded = await page.evaluate(async () => {
      if (!window.following) return false;
      const artist = await window.following.setFollowed({
        topic: { kind: 'artist', name: 'Low Tide' },
        followed: true,
      });
      const genre = await window.following.setFollowed({
        topic: { kind: 'genre', name: 'Electronic' },
        followed: true,
      });
      return artist.ok && genre.ok;
    });
    expect(seeded).toBe(true);
    await page.getByLabel('Discogs release ID', { exact: true }).fill('12');
    await page.getByRole('button', { name: 'Load release', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toBeVisible();
    await desktop.close();

    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await stubCatalogue();
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    const discover = page.getByRole('button', { name: 'Discover unseen releases', exact: true });
    await expect(discover).toBeEnabled();
    await discover.click();
    await expect(page.getByRole('button', { name: /Low Tide - Night Transit/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Mira North - First Light/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Quiet Orbit EP/ })).toHaveCount(0);
    await page.getByRole('button', { name: /Low Tide - Night Transit/ }).click();
    await expect(page.getByRole('heading', { name: 'Night Transit', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to Explore', exact: true }).click();
    await discover.click();
    await expect(page.getByRole('button', { name: /Mira North - First Light/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Low Tide - Night Transit/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Browse Low Tide', exact: true }).click();
    await expect(page.getByRole('button', { name: /Low Tide - Quiet Orbit EP/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Mira North - First Light/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Browse Electronic', exact: true }).click();
    await page.getByLabel('First year', { exact: true }).fill('1993');
    await page.getByLabel('Second year', { exact: true }).fill('2000');
    await page.getByRole('button', { name: 'Compare years', exact: true }).click();
    await expect(
      page.getByRole('region', { name: '1993', exact: true }).getByText('Mira North - First Light'),
    ).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: '2000', exact: true })
        .getByText('Still Waters - Late Signal'),
    ).toBeVisible();
  } finally {
    await desktop.close();
  }
});
