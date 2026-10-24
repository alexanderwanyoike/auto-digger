import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadedRelease } from '../discogsFixtures';

test('manages named crates and track annotations in the UI and browses downloads across sections', async () => {
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
    const page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    await page.evaluate(
      async (release) => {
        await window.catalogue?.add({ crateId: 'default', release });
      },
      { ...loadedRelease, formats: ['Album'] },
    );
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await page.getByRole('heading', { name: 'Crates', exact: true }).waitFor();
    await page.getByLabel('New crate name').fill('Night drive');
    await page.getByRole('button', { name: 'Create crate', exact: true }).click();
    await expect(page.getByLabel('Active crate')).toHaveValue(/.+/);
    await page.getByLabel('Active crate').selectOption({ label: 'My crate (1)' });
    await page.getByLabel('Pick Quiet Orbit').check();
    await page.getByLabel('Tags for Quiet Orbit', { exact: true }).fill('dub, warm-up');
    await page.getByRole('button', { name: 'Save tags for Quiet Orbit' }).click();
    await page.getByRole('button', { name: 'Downloads', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Downloads', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await expect(page.getByLabel('Pick Quiet Orbit')).toBeChecked();
    await expect(page.getByLabel('Tags for Quiet Orbit', { exact: true })).toHaveValue(
      'dub, warm-up',
    );
    await page.getByText('Manage My crate', { exact: true }).click();
    await page.getByRole('button', { name: 'Delete crate', exact: true }).click();
    await page.getByLabel('Active crate').selectOption({ label: 'Night drive (0)' });
    await page.getByText('Manage Night drive', { exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Confirm delete crate', exact: true }),
    ).toHaveCount(0);
    await page.getByLabel('Active crate').selectOption({ label: 'My crate (1)' });
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Digging desk' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Saved to crate', exact: true })).toBeDisabled();
    await page.evaluate(
      async (release) => window.audioLibrary?.download({ release, videoIndex: 0 }),
      loadedRelease,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Downloads', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toBeVisible();
    await page.getByLabel('Search downloads').fill('missing');
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toHaveCount(
      0,
    );
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Discogs account' })).toBeVisible();
    await expect(page.getByText('PHASE 06')).toHaveCount(0);
    await expect(page.getByRole('contentinfo', { name: 'Playback' })).toBeVisible();
    await page.screenshot({ path: 'test-results/settings-sections.png' });
  } finally {
    await desktop.close();
  }
});
