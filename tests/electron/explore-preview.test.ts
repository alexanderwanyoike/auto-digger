import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogs-fixtures';

test('keeps a playing sleeve visible and can reopen its release', async () => {
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
        let searches = 0;
        globalThis.fetch = (input) => {
          const url = new URL(input instanceof Request ? input.url : input.toString());
          if (url.pathname === '/oauth/identity')
            return Promise.resolve(Response.json(fixtures.identityResponse));
          if (url.pathname === '/releases/12')
            return Promise.resolve(
              Response.json({
                ...fixtures.releaseResponse,
                videos: [
                  ...fixtures.releaseResponse.videos,
                  { title: 'Low Tide - Quiet Orbit', uri: 'https://youtu.be/abcdefghijk' },
                ],
              }),
            );
          if (url.pathname === '/releases/13')
            return Promise.resolve(
              Response.json({
                ...fixtures.releaseResponse,
                id: 13,
                title: 'First Light',
                videos: [],
              }),
            );
          if (url.pathname === '/releases/20')
            return Promise.resolve(new Response(null, { status: 404 }));
          searches += 1;
          if (searches === 5) return Promise.resolve(new Response(null, { status: 401 }));
          const results = [
            { id: 12, title: 'Low Tide - Quiet Orbit EP', year: 1998 },
            { id: 20, title: 'Silt Relay - Missing Record', year: 2007 },
            {
              id: searches + 12,
              title: [
                'Mira North - First Light',
                'Still Waters - Late Signal',
                'Silt Relay - Back Channel',
                'Echo Lake - Another Record',
              ][searches - 1],
              year: 2000,
            },
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
    const sections = page.getByRole('navigation', { name: 'Main sections' });
    await expect(sections.getByRole('button').first()).toHaveText('Explore');
    await expect(sections.getByRole('button', { name: 'Explore' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-explore-token');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    const shelf = page.getByRole('region', { name: 'Discover records' });
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*First Light/ })).toBeVisible();

    await shelf.getByRole('button', { name: 'Play Low Tide - Quiet Orbit EP' }).click();
    const playback = page.getByRole('contentinfo', { name: 'Playback' });
    await expect(playback.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(playback).toContainText('Quiet Orbit');
    await expect(shelf).toBeVisible();
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*Quiet Orbit EP/ })).toBeVisible();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*Late Signal/ })).toBeVisible();
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*Quiet Orbit EP/ })).toBeVisible();
    await playback.getByRole('button', { name: 'Open playing release' }).click();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toBeVisible();
    await expect(playback.getByRole('button', { name: 'Pause' })).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*Back Channel/ })).toBeVisible();
    await expect(shelf.getByRole('button', { name: /^(?!Play ).*Quiet Orbit EP/ })).toHaveCount(0);
  } finally {
    await desktop.close();
  }
});
