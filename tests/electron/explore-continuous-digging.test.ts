import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogs-fixtures';

test('keeps digging through both dedicated discovery shelves as the listener scrolls', async () => {
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
        Math.random = () => 0.9;
        let retryFollowedPage = false;
        globalThis.fetch = (input) => {
          const url = new URL(input instanceof Request ? input.url : input.toString());
          if (url.pathname === '/oauth/identity')
            return Promise.resolve(Response.json(fixtures.identityResponse));
          if (url.pathname === '/releases/12')
            return Promise.resolve(Response.json(fixtures.releaseResponse));
          const label = url.searchParams.get('label');
          const style = url.searchParams.get('style');
          const scope = label === 'Still Records' ? 'Followed' : 'Personal';
          const current = Number(url.searchParams.get('page') ?? 1);
          if (!label && style !== 'Deep House' && style !== 'Progressive House')
            return Promise.resolve(new Response(null, { status: 400 }));
          if (label && label !== 'Still Records')
            return Promise.resolve(new Response(null, { status: 400 }));
          if (
            label &&
            current === 2 &&
            !retryFollowedPage &&
            Reflect.get(globalThis, 'rejectDiscoveryPage') === true
          ) {
            retryFollowedPage = true;
            return Promise.resolve(
              new Response(null, { status: 429, headers: { 'Retry-After': '2' } }),
            );
          }
          const start = (current - 1) * 30 + 1;
          const ids = Array.from({ length: 30 }, (_, index) => start + index);
          if (current === 3) ids[0] = 1;
          return Promise.resolve(
            Response.json({
              pagination: { page: current, pages: 3, per_page: 50, items: 90 },
              results: ids.map((id) => ({
                id: id + (scope === 'Followed' ? 200 : 100),
                title: `${scope} Record ${id.toString().padStart(3, '0')}`,
                year: 1998,
              })),
            }),
          );
        };
      },
      { identityResponse, releaseResponse },
    );
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-continuous-digging');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByLabel('Discogs release ID', { exact: true }).fill('12');
    await page.getByRole('button', { name: 'Load release', exact: true }).click();
    await page.getByRole('button', { name: 'Save EP to crate' }).click();
    await expect(page.getByRole('button', { name: 'Saved to crate' })).toBeDisabled();
    await page.getByRole('button', { name: 'Follow label Still Records', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Follow label Still Records' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Explore', exact: true }).click();

    const verifyShelf = async (shelf: string, scope: string) => {
      const section = page.getByRole('region', { name: shelf, exact: true });
      await section.getByRole('button', { name: 'Show more' }).click();
      const releases = section.getByRole('listitem');
      const scroll = () =>
        page.locator('.explore-scroll').evaluate((element) => {
          element.scrollTo(0, element.scrollHeight);
        });
      await expect(releases.nth(20)).toBeVisible();
      if (scope === 'Followed') {
        await desktop.evaluate(() => {
          Reflect.set(globalThis, 'rejectDiscoveryPage', true);
        });
        await scroll();
        await expect(section.getByRole('status')).toContainText('Discogs is pausing new requests');
        await expect(releases.nth(20)).toBeVisible();
      } else await scroll();
      await expect(releases.nth(55)).toBeVisible();
      await scroll();
      await expect(releases).toHaveCount(89);
      await expect(
        section.getByRole('button', { name: new RegExp(`^${scope} Record 001`) }),
      ).toHaveCount(1);
      await expect(
        section.getByRole('button', { name: new RegExp(`^${scope} Record 090`) }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Back to Feed' }).click();
    };
    await verifyShelf('Discover records', 'Personal');
    await verifyShelf('From your follows', 'Followed');
  } finally {
    await desktop.close();
  }
});
