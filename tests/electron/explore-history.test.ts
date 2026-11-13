import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogs-fixtures';

test('keeps a persistent Explore history of opened and played releases', async () => {
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
          if (searches === 4) return Promise.resolve(new Response(null, { status: 401 }));
          const results = [
            { id: 12, title: 'Low Tide - Quiet Orbit EP', year: 1998 },
            { id: 20, title: 'Silt Relay - Missing Record', year: 2007 },
            {
              id: searches + 12,
              title: [
                'Mira North - First Light',
                'Still Waters - Late Signal',
                'Silt Relay - Back Channel',
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

    await shelf.getByRole('button', { name: /^(?!Play ).*First Light/ }).click();
    await expect(page.getByRole('heading', { name: 'First Light', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to Explore', exact: true }).click();
    await shelf.getByRole('button', { name: 'Play Low Tide - Quiet Orbit EP' }).click();
    const playback = page.getByRole('contentinfo', { name: 'Playback' });
    await expect(playback.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(playback).toContainText('Quiet Orbit');
    await page.getByRole('button', { name: 'History', exact: true }).click({ timeout: 3000 });
    const history = page.getByRole('region', { name: 'History', exact: true });
    await expect(history.getByRole('button', { name: /Quiet Orbit EP.*Played/ })).toBeVisible();
    await expect(history.getByRole('button', { name: /First Light.*Opened/ })).toBeVisible();
    await expect(history.getByRole('listitem').first()).toContainText('Quiet Orbit EP');
    await history.getByRole('button', { name: /Quiet Orbit EP.*Played/ }).click();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'History', exact: true }).click();
    await expect(history.getByRole('button', { name: /Quiet Orbit EP.*Played/ })).toBeVisible();
    await expect(history.getByRole('button', { name: /First Light.*Opened/ })).toBeVisible();
  } finally {
    await desktop.close();
  }
});

test('opens a record and shows when its history could not be saved', async () => {
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
            return Promise.resolve(Response.json(fixtures.identity));
          if (url.pathname === '/releases/12')
            return Promise.resolve(Response.json(fixtures.release));
          return Promise.resolve(
            Response.json({
              pagination: { page: 1, pages: 1, per_page: 50, items: 1 },
              results: [{ id: 12, title: 'Quiet Orbit EP', year: 1998 }],
            }),
          );
        };
      },
      { identity: identityResponse, release: releaseResponse },
    );
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-history-warning');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    const open = page.getByRole('button', { name: /^Quiet Orbit EP/ });
    await expect(open).toBeVisible();
    const { DatabaseSync } = await import('node:sqlite');
    const database = new DatabaseSync(resolve(test.info().outputPath('profile'), 'catalog.sqlite'));
    try {
      database.exec(`
        CREATE TRIGGER reject_history_insert BEFORE INSERT ON release_activity
        BEGIN SELECT RAISE(ABORT, 'fixture storage error'); END;
      `);
    } finally {
      database.close();
    }
    await open.click();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(
      'Your discovery history could not be reached.',
    );
  } finally {
    await desktop.close();
  }
});
