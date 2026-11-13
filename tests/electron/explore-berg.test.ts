import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { identityResponse, releaseResponse } from '../discogs-fixtures';

test('opens the exact Berg artist and label catalogues from existing follows', async () => {
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
          const pagination = { page: 1, pages: 1, per_page: 50, items: 1 };
          if (url.pathname === '/oauth/identity')
            return Promise.resolve(Response.json(fixtures.identityResponse));
          if (url.pathname === '/releases/7314600')
            return Promise.resolve(
              Response.json({ ...fixtures.releaseResponse, id: 7314600, title: 'Berg 03' }),
            );
          if (url.pathname === '/artists/3470200/releases')
            return Promise.resolve(
              Response.json({
                pagination,
                releases: [
                  {
                    id: 934459,
                    main_release: 7314600,
                    type: 'master',
                    artist: 'Berg (15)',
                    title: 'Berg 03',
                    year: 2015,
                  },
                ],
              }),
            );
          if (url.pathname === '/labels/592563/releases')
            return Promise.resolve(
              Response.json({
                pagination,
                releases: [
                  {
                    id: 5831019,
                    artist: 'Berg (15)',
                    title: 'Berg 02',
                    year: 2014,
                    format: '12", W/Lbl',
                  },
                ],
              }),
            );
          const type = url.searchParams.get('type');
          const query = url.searchParams.get('q');
          const results =
            type === 'artist' && query === 'Berg (15)'
              ? [
                  { id: 1213860, title: 'Berg (6)' },
                  { id: 3470200, title: 'Berg (15)' },
                ]
              : type === 'label' && query === 'Berg (2)'
                ? [
                    { id: 388029, title: 'Berg' },
                    { id: 592563, title: 'Berg (2)' },
                  ]
                : [];
          return Promise.resolve(
            Response.json({ pagination: { ...pagination, items: results.length }, results }),
          );
        };
      },
      { identityResponse, releaseResponse },
    );
    await expect(page.getByRole('heading', { name: 'Explore' })).toBeVisible();
    await page.evaluate(async () => {
      await window.following?.setFollowed({
        topic: { kind: 'artist', name: 'Berg (15)' },
        followed: true,
      });
      await window.following?.setFollowed({
        topic: { kind: 'label', name: 'Berg (2)' },
        followed: true,
      });
    });
    await page.reload();
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('fixture-berg');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await expect(
      page
        .getByRole('region', { name: 'From your follows' })
        .getByRole('button', { name: /^(?!Play ).*Berg 02/ }),
    ).toBeVisible();
    const tabs = page.getByRole('navigation', { name: 'Explore sections' });
    await tabs.getByRole('button', { name: 'Following', exact: true }).click();
    await page.getByRole('button', { name: 'Explore artist Berg (15)' }).click();
    const catalogue = page.getByRole('region', { name: 'Catalogue results' });
    await catalogue.getByRole('button', { name: /Berg 03/ }).click();
    await expect(page.getByRole('heading', { name: 'Berg 03' })).toBeVisible();
    await page.getByRole('button', { name: 'Back to Following' }).click();
    await page.getByRole('button', { name: 'Labels', exact: true }).click();
    await page.getByRole('button', { name: 'Explore label Berg (2)' }).click();
    await expect(catalogue.getByRole('button', { name: /Berg 02/ })).toBeVisible();
  } finally {
    await desktop.close();
  }
});
