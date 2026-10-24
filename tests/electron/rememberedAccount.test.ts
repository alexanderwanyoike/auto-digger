import { _electron as electron, expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

test('remembers an encrypted Discogs token across app restarts and forgets it on disconnect', async () => {
  const profile = test.info().outputPath('remembered-profile');
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  const launch = () =>
    electron.launch({
      args: [resolve('tests/encryptedDesktop.cjs'), `--user-data-dir=${profile}`],
      env: { ...environment, AUTO_DIGGER_TEST_IDENTITY: '1' },
    });
  let desktop = await launch();
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('remembered-test-token');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }),
    ).toBeEnabled();
    const bytes = await readFile(join(profile, 'discogs-token.bin'));
    expect(bytes.toString('utf8')).not.toContain('remembered-test-token');
    await desktop.close();
    desktop = await launch();
    page = await desktop.firstWindow();
    await expect(
      page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }),
    ).toBeEnabled();
    expect(JSON.stringify(await page.evaluate(() => window.discogs?.account()))).not.toContain(
      'remembered-test-token',
    );
    await page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }).click();
    await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
    await desktop.close();
    desktop = await launch();
    page = await desktop.firstWindow();
    await expect(
      page.getByRole('button', { name: 'Discogs not connected', exact: true }),
    ).toBeEnabled();
    expect(await page.evaluate(() => window.discogs?.account())).toEqual({ ok: true, value: null });
  } finally {
    await desktop.close();
  }
});
