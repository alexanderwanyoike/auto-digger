import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadedRelease } from '../discogsFixtures';

test('reopens the active named crate and its releases instead of showing the empty default crate', async () => {
  const options = {
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
  };
  let desktop = await electron.launch(options);
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await page.getByLabel('New crate name').fill('After hours');
    await page.getByRole('button', { name: 'Create crate', exact: true }).click();
    const picker = page.getByRole('combobox', { name: 'Active crate', exact: true });
    await expect(picker).toContainText('After hours (0)');
    const id = await picker.inputValue();
    expect(id).not.toBe('default');
    const added = await page.evaluate(
      async ({ crateId, release }) => window.catalogue?.add({ crateId, release }),
      { crateId: id, release: loadedRelease },
    );
    expect(added).toMatchObject({ ok: true });
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }),
    ).toBeVisible();
    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    const restored = page.getByRole('combobox', { name: 'Active crate', exact: true });
    await expect(restored).toContainText('After hours (1)');
    expect(
      await page.evaluate(async (crateId) => window.catalogue?.view(crateId), id),
    ).toMatchObject({ ok: true, value: { entries: [{ release: { id: 12 } }] } });
    await page.screenshot({ path: 'test-results/remembered-crate-reopened.png' });
    await expect(restored).toHaveValue(id);
    await expect(
      page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }),
    ).toBeVisible();
  } finally {
    await desktop.close();
  }
});
