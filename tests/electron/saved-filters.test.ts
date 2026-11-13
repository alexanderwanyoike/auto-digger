import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('restores named filters, their results page and the current draft after restarting', async () => {
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
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    const stubSearch = () =>
      desktop.evaluate(() => {
        const fetchIdentity = globalThis.fetch;
        globalThis.fetch = (input, init) => {
          const url = new URL(input instanceof Request ? input.url : input.toString());
          if (url.pathname !== '/database/search') return fetchIdentity(input, init);
          const number = Number(url.searchParams.get('page'));
          return Promise.resolve(
            Response.json({
              pagination: { page: number, pages: 3, per_page: 50, items: 120 },
              results: [{ id: number, title: `Low Tide - Orbit ${number.toString()}` }],
            }),
          );
        };
      });
    await stubSearch();
    await page.evaluate(async () => window.discogs?.connect('synthetic-token'));
    await page.reload();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await expect(page.getByLabel('Year', { exact: true })).toBeEnabled();
    await page.getByLabel('Year', { exact: true }).fill('1998');
    await page.getByLabel('Label', { exact: true }).fill('Still Records');
    await page.getByRole('combobox', { name: 'Genre', exact: true }).fill('Electronic');
    await page.getByRole('option', { name: 'Electronic', exact: true }).click();
    await page.getByRole('combobox', { name: 'Genre', exact: true }).press('Escape');
    await page.getByRole('combobox', { name: 'Release type', exact: true }).fill('Album');
    await page.getByRole('option', { name: 'Album', exact: true }).click();
    await page.getByRole('combobox', { name: 'Release type', exact: true }).press('Escape');
    await page.getByRole('button', { name: 'Search releases', exact: true }).click();
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save filters', exact: true }).click();
    await page.getByLabel('Filter name', { exact: true }).fill('Nineties house');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Saved filters', exact: true })).toHaveValue(
      /.+/,
    );
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await page.getByLabel('Year', { exact: true }).fill('2001');
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const result = await window.savedFilters?.read();
          return result?.ok ? result.value.draft.year : null;
        }),
      )
      .toBe('2001');
    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await stubSearch();
    await expect(page.getByLabel('Year', { exact: true })).toHaveValue('2001');
    await page
      .getByRole('combobox', { name: 'Saved filters', exact: true })
      .selectOption({ label: 'Nineties house' });
    await expect(page.getByLabel('Year', { exact: true })).toHaveValue('1998');
    await expect(page.getByLabel('Label', { exact: true })).toHaveValue('Still Records');
    await expect(page.locator('input[name="genre"]')).toHaveValue('Electronic');
    await expect(page.locator('input[name="format"]')).toHaveValue('Album');
    await page.getByRole('button', { name: 'Search releases', exact: true }).click();
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(page.getByText('Page 3 of 3', { exact: true })).toBeVisible();
    await page.getByLabel('Year', { exact: true }).fill('2001');
    await page.getByRole('button', { name: 'Search releases', exact: true }).click();
    await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
    const picker = page.getByRole('combobox', { name: 'Saved filters', exact: true });
    await picker.selectOption('');
    await picker.selectOption({ label: 'Nineties house' });
    await page.getByRole('button', { name: 'Search releases', exact: true }).click();
    await expect(page.getByText('Page 3 of 3', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Delete saved filters', exact: true }).click();
    await expect(
      page
        .getByRole('combobox', { name: 'Saved filters', exact: true })
        .getByRole('option', { name: 'Nineties house' }),
    ).toHaveCount(0);
  } finally {
    await desktop.close();
  }
});
