import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import type { ElectronApplication, Page } from '@playwright/test';
import { selectAppearance } from '../appearance';
import { identityResponse, releaseResponse } from '../discogs-fixtures';

function launch(profile: string) {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  return electron.launch({
    args: [resolve('tests/encrypted-desktop.cjs'), `--user-data-dir=${profile}`],
    env: environment,
  });
}
async function playerFixture(page: Page) {
  await page.route('https://i.discogs.com/**', async (route) => {
    await route.abort();
  });
}

test('keeps a whole EP after restart, reopens it disconnected and persists removal', async () => {
  const profile = test.info().outputPath('crate-profile');
  let desktop: ElectronApplication = await launch(profile);
  try {
    let page = await desktop.firstWindow();
    await playerFixture(page);
    await desktop.evaluate(
      (_electron, fixtures) => {
        globalThis.fetch = (input) =>
          Promise.resolve(
            new Response(
              JSON.stringify(
                (input instanceof Request ? input.url : input.toString()).endsWith(
                  '/oauth/identity',
                )
                  ? fixtures.identityResponse
                  : fixtures.releaseResponse,
              ),
            ),
          );
      },
      { identityResponse, releaseResponse },
    );
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('test-only-token');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await page.getByLabel('Discogs release ID').fill('12');
    await page.getByRole('button', { name: 'Load release', exact: true }).click();
    await page.getByRole('button', { name: 'Save EP to crate', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Saved to crate', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }).click();
    await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
    await desktop.close();
    desktop = await launch(profile);
    page = await desktop.firstWindow();
    await playerFixture(page);
    await expect(
      page.getByRole('button', { name: 'Discogs not connected', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download audio', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Load release', exact: true })).toBeDisabled();
    await page.setViewportSize({ width: 900, height: 780 });
    await expect(page.getByText('Built for the long way round.', { exact: true })).toBeInViewport({
      ratio: 1,
    });
    await page.screenshot({ path: 'test-results/phase-6-crate-light.png' });
    await selectAppearance(page, 'Dark');
    await page.screenshot({ path: 'test-results/phase-6-crate-dark.png' });
    await page.getByRole('button', { name: 'Remove Quiet Orbit EP', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }),
    ).toHaveCount(0);
    await desktop.close();
    desktop = await launch(profile);
    page = await desktop.firstWindow();
    await expect(page.getByText('No records saved yet.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.crate?.list())).toEqual({ ok: true, value: [] });
  } finally {
    await desktop.close();
  }
});
