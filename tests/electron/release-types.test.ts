import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogsFixtures';

test('searches and digs multiple release types, saves a non-EP and clears to all types', async () => {
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
    await desktop.evaluate(
      (_electron, fixtures) => {
        const releases = [
          { id: 12, title: 'Night Album', type: 'Album' },
          { id: 13, title: 'Night Compilation', type: 'Compilation' },
          { id: 14, title: 'Night Single', type: 'Single' },
        ];
        globalThis.fetch = (input) => {
          const url = new URL(input instanceof Request ? input.url : input.toString());
          if (url.pathname === '/oauth/identity')
            return Promise.resolve(new Response(JSON.stringify(fixtures.identityResponse)));
          if (url.pathname === '/database/search') {
            const types = url.searchParams.get('format');
            if (types !== null && types !== 'Album|Compilation')
              return Promise.resolve(new Response('{}', { status: 400 }));
            const matches = types ? releases.slice(0, 2) : releases;
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  pagination: { page: 1, pages: 1, per_page: 50, items: matches.length },
                  results: matches.map((release) => ({ ...release, format: [release.type] })),
                }),
              ),
            );
          }
          const release = releases.find(
            (entry) => url.pathname === `/releases/${entry.id.toString()}`,
          );
          return Promise.resolve(
            release
              ? new Response(
                  JSON.stringify({
                    ...fixtures.releaseResponse,
                    id: release.id,
                    title: release.title,
                    images: [],
                    videos: [],
                    formats: [{ name: 'CD', descriptions: [release.type] }],
                  }),
                )
              : new Response('{}', { status: 404 }),
          );
        };
      },
      { identityResponse, releaseResponse },
    );
    const page = await desktop.firstWindow();
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('release-types-fixture');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }).waitFor();
    const type = page.getByLabel('Release type', { exact: true });
    await type.fill('Album');
    await page.getByRole('option', { name: 'Album', exact: true }).click();
    await type.fill('Compilation');
    await page.getByRole('option', { name: 'Compilation', exact: true }).click();
    await type.press('Escape');
    await page.getByRole('button', { name: 'Search releases', exact: true }).click();
    await expect(page.getByText('2 matching releases', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Matching releases' })).not.toContainText(
      'Night Single',
    );
    await page.getByRole('button', { name: 'Dig a random release', exact: true }).click();
    await expect(page.getByText('1 found · 2 accessible matches', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Night (Album|Compilation)$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Save release to crate', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Saved to crate', exact: true })).toBeDisabled();
    await page.getByLabel('Remove Album', { exact: true }).click();
    await page.getByLabel('Remove Compilation', { exact: true }).click();
    await type.press('Escape');
    await page.getByRole('button', { name: 'Search releases', exact: true }).click();
    await expect(page.getByText('3 matching releases', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Matching releases' })).toContainText(
      'Night Single',
    );
    await page.screenshot({ path: 'test-results/release-types-all.png' });
  } finally {
    await desktop.close();
  }
});
