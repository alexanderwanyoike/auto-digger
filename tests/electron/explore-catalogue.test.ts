import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogs-fixtures';

test('scrolls through populated catalogue years and appends release pages', async () => {
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
          if (url.pathname === '/releases/15')
            return Promise.resolve(
              Response.json({ ...fixtures.releaseResponse, id: 15, videos: [] }),
            );
          if (url.pathname.startsWith('/releases/')) {
            const id = Number(url.pathname.split('/').at(-1));
            return Promise.resolve(Response.json({ ...fixtures.releaseResponse, id }));
          }
          const year = url.searchParams.get('year') ?? '';
          const pageNumber = Number(url.searchParams.get('page') ?? 1);
          const range = year.split('-').map(Number);
          const matches = [
            { id: 14, title: 'Mira North - First Light', year: 1993 },
            { id: 15, title: 'Mira North - Evening Light', year: 1993 },
            ...Array.from({ length: 8 }, (_, index) => ({
              id: 20 + index,
              title: `Silt Relay - Back Channel ${(index + 1).toString()}`,
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
              pagination: {
                page: pageNumber,
                pages: year === '2000' ? 2 : 1,
                per_page: 50,
                items: results.length,
              },
              results:
                year === '2000' ? results.slice((pageNumber - 1) * 6, pageNumber * 6) : results,
            }),
          );
        };
      },
      { identityResponse, releaseResponse },
    );
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-explore-catalogue');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    const shelf = page.getByRole('region', { name: 'Discover records' });
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*Quiet Orbit EP/ })).toBeVisible();
    await shelf.getByRole('button', { name: /^(?!Play ).*Quiet Orbit EP/ }).click();
    await page.getByRole('button', { name: 'Save EP to crate' }).click();
    await expect(page.getByRole('button', { name: 'Saved to crate' })).toBeDisabled();
    await page.getByRole('button', { name: 'Back to Explore', exact: true }).click();
    const navigation = page.getByRole('navigation', { name: 'Explore sections' });
    await expect(navigation.getByRole('button', { name: 'Feed' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await navigation.getByRole('button', { name: 'Catalogue', exact: true }).click();
    await expect(page.getByText('Deep House', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Style' }).click();
    await expect(page.getByRole('listbox').getByRole('option').first()).toHaveText('Deep House');
    const style = page.getByRole('combobox', { name: 'Style' });
    await style.fill('Progressive House');
    await page.getByRole('option', { name: 'Progressive House', exact: true }).click();
    const years = page.getByRole('navigation', { name: 'Release years' });
    await expect(years.getByRole('button', { name: '1993' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(years.getByRole('button', { name: '1994' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(?!Play ).*Evening Light/ })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Play Mira North - Evening Light' }),
    ).toBeVisible();
    const scrollbar = page.getByRole('slider', { name: 'Explore content scroll position' });
    await expect(scrollbar).toBeVisible();
    const tabsBottom = await navigation.evaluate(
      (element) => element.closest('.explore-toolbar')?.getBoundingClientRect().bottom ?? 0,
    );
    const viewport = page.locator('.explore-scroll');
    const viewportBounds = await viewport.boundingBox();
    const track = await scrollbar.boundingBox();
    if (!track || !viewportBounds) throw new Error('The Explore scrollbar must have a track');
    expect(viewportBounds.y).toBeCloseTo(tabsBottom, 0);
    expect(track.height).toBeLessThan(viewportBounds.height / 2);
    expect(track.y + track.height / 2).toBeCloseTo(viewportBounds.y + viewportBounds.height / 2, 0);
    expect(track.x + track.width).toBeLessThan(viewportBounds.x + viewportBounds.width);
    const ticks = page.locator('.explore-scrollbar-tick');
    const tickWidths = () =>
      ticks.evaluateAll((marks) => marks.map((mark) => mark.getBoundingClientRect().width));
    const resting = await tickWidths();
    expect(resting.length).toBeGreaterThan(10);
    const middle = Math.floor(resting.length / 2);
    const restingMiddle = resting[middle];
    if (restingMiddle === undefined) throw new Error('The track must have a middle tick');
    const hoveredX = track.x + track.width / 2;
    const hoveredY = track.y + track.height / 2;
    await page.mouse.move(hoveredX, hoveredY);
    await expect.poll(async () => (await tickWidths())[middle]).toBeGreaterThan(restingMiddle + 7);
    const expanded = await tickWidths();
    expect(expanded[middle]).toBeGreaterThan(expanded[middle + 2]);
    expect(expanded[middle + 2]).toBeGreaterThan(resting[middle + 2]);
    expect(expanded[0]).toBe(resting[0]);
    await page.mouse.move(hoveredX, hoveredY + track.height / 4);
    await expect.poll(async () => (await tickWidths())[middle]).toBeCloseTo(restingMiddle);
    await expect
      .poll(async () => Math.max(...(await tickWidths())))
      .toBeGreaterThan(restingMiddle + 7);
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(0);
    await page.mouse.move(hoveredX - 50, hoveredY);
    await expect.poll(tickWidths).toEqual(resting);
    const catalogueTab = navigation.getByRole('button', { name: 'Catalogue' });
    const scrollTop = () => viewport.evaluate((element) => element.scrollTop);
    await catalogueTab.hover();
    await page.mouse.wheel(0, 120);
    await expect.poll(scrollTop).toBeGreaterThan(0);
    await catalogueTab.press('Home');
    await expect.poll(scrollTop).toBe(0);
    await catalogueTab.press('ArrowDown');
    await expect.poll(scrollTop).toBeGreaterThan(0);
    await catalogueTab.press('ArrowUp');
    await expect.poll(scrollTop).toBe(0);
    await catalogueTab.press('PageDown');
    await expect.poll(scrollTop).toBeGreaterThan(0);
    await scrollbar.press('Home');
    await expect.poll(scrollTop).toBe(0);
    await scrollbar.press('PageDown');
    await expect.poll(scrollTop).toBeGreaterThan(0);
    await scrollbar.press('Home');
    await expect.poll(scrollTop).toBe(0);
    await page.mouse.move(track.x + track.width / 2, track.y + 10);
    await page.mouse.down();
    await page.mouse.move(track.x + track.width / 2, track.y + track.height / 3, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect(navigation).toBeInViewport();
    const beforeWheel = await viewport.evaluate((element) => element.scrollTop);
    await page.mouse.wheel(0, -100);
    await expect.poll(scrollTop).toBeLessThan(beforeWheel);
    await scrollbar.press('Home');
    await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBe(0);
    await expect(page.getByRole('button', { name: 'Load more releases' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Play Mira North - Evening Light' }).click();
    await expect(page.locator('.explore-toolbar').getByRole('alert')).toHaveText(
      'No clear preview source is available for this release.',
    );
    await expect(page.getByRole('button', { name: /^(?!Play ).*Back Channel 6/ })).toBeVisible();
    const year = page.getByRole('region', { name: '2000', exact: true });
    await year.getByRole('button', { name: 'Show more' }).click({ timeout: 3000 });
    await expect(page.getByRole('heading', { name: '2000', level: 2 })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Play Silt Relay - Back Channel 1' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load more releases' })).toHaveCount(0);
    await viewport.evaluate((element) => {
      element.scrollTo(0, element.scrollHeight);
    });
    await expect(
      page.getByRole('button', { name: 'Play Silt Relay - Back Channel 8' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Back to Catalogue' }).click();
    await viewport.evaluate((element) => {
      element.scrollTo(0, element.scrollHeight);
    });
    await expect(page.getByRole('button', { name: /^(?!Play ).*Back Channel 8/ })).toBeVisible();
    await viewport.evaluate((element) => {
      element.scrollTo(0, element.scrollHeight);
    });
    await expect(years.getByRole('button', { name: '2000' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.getByRole('button', { name: /^(?!Play ).*Back Channel 6/ })).toBeAttached();
    await year.getByRole('button', { name: 'Show more' }).click({ timeout: 3000 });
    await expect(page.getByRole('heading', { name: '2000', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: /^(?!Play ).*Back Channel 8/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^(?!Play ).*Evening Light/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Back to Catalogue' }).click();
    await expect(year.getByRole('button', { name: 'Show more' })).toBeVisible();
    const record = page.getByRole('button', { name: /^(?!Play ).*Back Channel 8/ });
    await record.scrollIntoViewIfNeeded();
    const savedPosition = await scrollTop();
    expect(savedPosition).toBeGreaterThan(0);
    await record.click();
    await page.getByRole('button', { name: 'Back to Catalogue' }).click();
    await expect.poll(scrollTop).toBe(savedPosition);
    await expect(record).toBeInViewport();
  } finally {
    await desktop.close();
  }
});
