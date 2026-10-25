import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('restores named filters, multiselects and the current year range after restarting', async () => {
  const options = {
    args: [resolve('tests/encryptedDesktop.cjs'), `--user-data-dir=${test.info().outputPath('profile')}`],
    env: { ...Object.fromEntries(Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    )), AUTO_DIGGER_TEST_IDENTITY: '1' },
  };
  let desktop = await electron.launch(options);
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    await page.evaluate(async () => window.discogs?.connect('synthetic-token'));
    await page.reload();
    await expect(page.getByLabel('Year', { exact: true })).toBeEnabled();
    await page.getByLabel('Year', { exact: true }).fill('1990-1999');
    await page.getByLabel('Label', { exact: true }).fill('Still Records');
    await page.getByRole('combobox', { name: 'Genre', exact: true }).fill('Electronic');
    await page.getByRole('option', { name: 'Electronic', exact: true }).click();
    await page.getByRole('combobox', { name: 'Release type', exact: true }).fill('Album');
    await page.getByRole('option', { name: 'Album', exact: true }).click();
    await page.getByRole('button', { name: 'Save filters', exact: true }).click();
    await page.getByLabel('Filter name', { exact: true }).fill('Nineties house');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Saved filters', exact: true })).toHaveValue(/.+/);
    await page.getByLabel('Year', { exact: true }).fill('2001');
    await expect.poll(async () => page.evaluate(async () => {
      const result = await window.savedFilters?.read();
      return result?.ok ? result.value.draft.year : null;
    })).toBe('2001');
    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await expect(page.getByLabel('Year', { exact: true })).toHaveValue('2001');
    await page.getByRole('combobox', { name: 'Saved filters', exact: true }).selectOption({ label: 'Nineties house' });
    await expect(page.getByLabel('Year', { exact: true })).toHaveValue('1990-1999');
    await expect(page.getByLabel('Label', { exact: true })).toHaveValue('Still Records');
    await expect(page.locator('input[name="genre"]')).toHaveValue('Electronic');
    await expect(page.locator('input[name="format"]')).toHaveValue('Album');
    await page.getByRole('button', { name: 'Delete saved filters', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Saved filters', exact: true }).getByRole('option', { name: 'Nineties house' })).toHaveCount(0);
  } finally { await desktop.close(); }
});
