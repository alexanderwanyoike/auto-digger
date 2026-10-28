import { _electron as electron, expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import NodeID3 from 'node-id3';
import { loadedRelease } from '../discogs-fixtures';

test('remembers Cosine securely, previews recommendations, opens the EP and saves the cached upload', async () => {
  const profile = test.info().outputPath('profile');
  const log = test.info().outputPath('requests.log');
  const launch = () =>
    electron.launch({
      args: [resolve('tests/cosine-desktop.cjs'), `--user-data-dir=${profile}`],
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
          ),
        ),
        AUTO_DIGGER_TEST_DOWNLOAD_LOG: log,
      },
    });
  let desktop = await launch();
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('synthetic-discogs-token');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('region', { name: 'Cosine Club settings' });
    await settings.getByLabel('Cosine Club API key').fill('synthetic-cosine-key');
    await settings.getByRole('button', { name: 'Save Cosine key', exact: true }).click();
    await expect(settings.getByText('Cosine key saved.', { exact: true })).toBeVisible();
    await expect(settings.getByLabel('Cosine Club API key')).toHaveValue('');
    expect((await readFile(join(profile, 'cosine-key.bin'))).toString()).not.toContain(
      'synthetic-cosine-key',
    );
    await page.evaluate((release) => window.crate?.save(release), loadedRelease);
    await desktop.close();
    desktop = await launch();
    page = await desktop.firstWindow();
    await page.getByLabel('Label', { exact: true }).fill('Keep this label');
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    await page.getByRole('button', { name: 'Find similar to Quiet Orbit', exact: true }).click();
    const results = page.getByRole('region', { name: 'Recommendations', exact: true });
    await expect(results.locator('.recommendation-list > li')).toHaveCount(2);
    await expect(
      results.getByRole('button', { name: 'Open release for Later Orbit (Dub Mix)', exact: true }),
    ).toBeDisabled();
    await results.getByText('Refine recommendations', { exact: true }).click();
    await results.getByLabel('From year').fill('2000');
    await results.getByLabel('To year').fill('2010');
    await results.getByRole('button', { name: 'Refresh recommendations', exact: true }).click();
    await results
      .getByRole('button', { name: 'Preview Later Orbit (Club Mix)', exact: true })
      .click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.audioLibrary?.list())).toEqual({ ok: true, value: [] });
    await expect(
      results.getByRole('button', { name: 'Open release for Later Orbit (Club Mix)', exact: true }),
    ).toBeEnabled();
    await page.screenshot({ path: test.info().outputPath('recommendations.png') });
    await results
      .getByRole('button', { name: 'Open release for Later Orbit (Club Mix)', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Later EP', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Download audio', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.audioLibrary?.list()))
      .toMatchObject({
        ok: true,
        value: [
          {
            title: 'Later Orbit (Club Mix)',
            artist: 'Still Waters',
            album: 'Later EP',
            trackIndex: 0,
          },
        ],
      });
    const saved = await page.evaluate(() => window.audioLibrary?.list());
    if (!saved?.ok || !saved.value[0]) throw new Error('Expected saved recommendation');
    const music = await desktop.evaluate(({ app }) => app.getPath('music'));
    expect(
      await NodeID3.Promise.read(
        join(
          music,
          'Auto Digger',
          'YouTube',
          'Electronic',
          'Deep House',
          '2002',
          saved.value[0].filename,
        ),
      ),
    ).toMatchObject({
      title: 'Later Orbit (Club Mix)',
      artist: 'Still Waters',
      album: 'Later EP',
      genre: 'Deep House',
    });
    expect((await readFile(log, 'utf8')).trim().split('\n')).toHaveLength(1);
    await page.screenshot({ path: test.info().outputPath('linked-release.png') });
    await page.getByRole('button', { name: 'Back to recommendations', exact: true }).click();
    await results.getByText('Refine recommendations', { exact: true }).click();
    await expect(results.getByLabel('From year')).toHaveValue('2000');
    await results.getByRole('button', { name: 'Back to Quiet Orbit EP', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toBeVisible();
    await expect(page.getByLabel('Label', { exact: true })).toHaveValue('Keep this label');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Forget Cosine key', exact: true }).click();
    expect(await page.evaluate(() => window.cosine?.status())).toEqual({
      ok: true,
      value: { configured: false },
    });
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Find similar to Quiet Orbit', exact: true }),
    ).toHaveCount(0);
  } finally {
    await desktop.close();
  }
});
