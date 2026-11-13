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
    await page.getByRole('button', { name: 'Following', exact: true }).click();
    await desktop.evaluate(() => {
      const request = globalThis.fetch;
      let retriedArtist = false;
      globalThis.fetch = (input, init) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname !== '/database/search') return request(input, init);
        const kind = url.searchParams.get('type');
        if (kind === 'artist' && !retriedArtist) {
          retriedArtist = true;
          return Promise.resolve(new Response(null, { status: 503 }));
        }
        if (kind === 'artist' || kind === 'label') {
          return Promise.resolve(
            Response.json({
              results: [
                { title: 'Unrelated', thumb: 'https://i.discogs.com/unrelated.jpg' },
                { title: url.searchParams.get('q'), thumb: `https://i.discogs.com/${kind}.jpg` },
              ],
            }),
          );
        }
        return Promise.resolve(
          Response.json({ pagination: { page: 1, pages: 1, per_page: 50, items: 0 }, results: [] }),
        );
      };
    });
    await page.route('https://i.discogs.com/**', (route) =>
      route.fulfill({
        path: resolve('tests/fixtures/record-sleeve.svg'),
        contentType: 'image/svg+xml',
      }),
    );
    const following = page.getByRole('region', { name: 'Following', exact: true });
    await following.getByRole('button', { name: 'Artists', exact: true }).click();
    await expect(
      following.getByRole('button', { name: 'Browse Low Tide' }).locator('img'),
    ).toHaveAttribute('src', 'https://i.discogs.com/artist.jpg');
    await expect(following.getByRole('button', { name: 'Browse Still Records' })).toHaveCount(0);
    await following.getByRole('button', { name: 'Labels', exact: true }).click();
    await expect(
      following.getByRole('button', { name: 'Browse Still Records' }).locator('img'),
    ).toHaveAttribute('src', 'https://i.discogs.com/label.jpg');
    await expect(following.getByRole('button', { name: 'Browse Low Tide' })).toHaveCount(0);
    await following
      .getByRole('button', { name: 'Unfollow label Still Records', exact: true })
      .click();
    await expect(following.getByRole('button', { name: 'Browse Still Records' })).toHaveCount(0);
    await following.getByRole('button', { name: 'Genres', exact: true }).click();
    await expect(following.getByRole('button', { name: 'Browse Electronic' })).toBeVisible();
  } finally {
    await desktop.close();
  }
});

test('searches and pages through 1,000 followed labels', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    const seeded = await page.evaluate(async () => {
      const bridge = window.following;
      if (!bridge) return false;
      const results = await Promise.all(
        Array.from({ length: 1000 }, (_, index) =>
          bridge.setFollowed({
            topic: { kind: 'label', name: `Label ${(index + 1).toString().padStart(4, '0')}` },
            followed: true,
          }),
        ),
      );
      return results.every((result) => result.ok);
    });
    expect(seeded).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Following', exact: true }).click();
    await page.setViewportSize({ width: 900, height: 780 });
    const gallery = page.getByRole('region', { name: 'Following' });
    await gallery.getByRole('button', { name: 'Labels', exact: true }).click();
    await expect(gallery.getByRole('listitem')).toHaveCount(24);
    await gallery.getByRole('button', { name: 'Next page' }).click();
    await expect(gallery.getByRole('button', { name: 'Browse Label 0025' })).toBeInViewport();
    await gallery.getByRole('searchbox', { name: 'Search follows' }).fill('1000');
    await expect(gallery.getByRole('listitem')).toHaveCount(1);
    await expect(gallery.getByRole('button', { name: 'Browse Label 1000' })).toBeVisible();
  } finally {
    await desktop.close();
  }
});

test('drops queued portrait lookups when the listener leaves Following', async () => {
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
        const artworkStarted = { count: 0 };
        Object.assign(globalThis, { artworkStarted });
        globalThis.fetch = async (input) => {
          const url = new URL(input instanceof Request ? input.url : input.toString());
          if (url.pathname === '/oauth/identity') return Response.json(fixtures.identity);
          if (url.pathname === '/releases/12') return Response.json(fixtures.release);
          if (url.searchParams.get('type') === 'label') {
            await new Promise((done) => {
              artworkStarted.count += 1;
              setTimeout(done, 8000);
            });
            return Response.json({ results: [] });
          }
          return Response.json({
            pagination: { page: 1, pages: 0, per_page: 50, items: 0 },
            results: [],
          });
        };
      },
      { identity: identityResponse, release: releaseResponse },
    );
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-following-queue');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByLabel('Discogs release ID', { exact: true }).fill('12');
    await page.getByRole('button', { name: 'Load release', exact: true }).click();
    await page.getByRole('button', { name: 'Follow label Still Records', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Follow label Still Records', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    await page.getByRole('button', { name: 'Following', exact: true }).click();
    await page.getByRole('button', { name: 'Labels', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Browse Still Records', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => desktop.evaluate(() => Reflect.get(globalThis, 'artworkStarted') as unknown))
      .toMatchObject({ count: 1 });
    await page.getByRole('button', { name: 'Feed', exact: true }).click();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click({ timeout: 3500 });
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled({
      timeout: 3500,
    });
  } finally {
    await desktop.close();
  }
});
