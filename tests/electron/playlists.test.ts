import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';

test('downloads a liked track once, shares it with a playlist and restores both after restart', async () => {
  const options = {
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  };
  let desktop = await electron.launch(options);
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Explore' }).waitFor();
    await page.evaluate(async (record) => window.crate?.save(record), {
      ...loadedRelease,
      tracks: [
        ...loadedRelease.tracks,
        { position: 'B1', title: 'No attached audio', duration: '' },
      ],
    });
    await page.reload();
    await page.getByRole('button', { name: 'Playlists', exact: true }).click({ timeout: 5000 });
    await page.getByLabel('New playlist name', { exact: true }).fill('After hours');
    await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'After hours', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    const like = page.getByRole('button', { name: 'Like Quiet Orbit', exact: true });
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Like No attached audio', exact: true }).click();
    await page.getByRole('button', { name: 'Add Quiet Orbit to playlist', exact: true }).click();
    await page.getByRole('button', { name: 'Add to After hours', exact: true }).click();
    await page.getByRole('button', { name: 'Playlists', exact: true }).click();
    await page.getByRole('button', { name: 'Likes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toBeEnabled();
    await expect(
      page.getByRole('button', { name: 'Choose audio for No attached audio', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'After hours', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toBeEnabled();
    await expect
      .poll(() => page.evaluate(async () => window.audioLibrary?.list()))
      .toMatchObject({
        ok: true,
        value: [{ id: '12-abcdefghijk' }],
      });
    expect(await page.evaluate(async () => window.downloadJobs?.list())).toMatchObject({
      ok: true,
      value: [{ sourceId: '12-abcdefghijk', stage: 'complete' }],
    });

    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Playlists', exact: true }).click();
    await page.getByRole('button', { name: 'After hours', exact: true }).click();
    await page.getByRole('button', { name: 'Play Quiet Orbit', exact: true }).click();
    await expect(
      page
        .getByRole('contentinfo', { name: 'Playback' })
        .getByRole('button', { name: 'Pause', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Likes', exact: true }).click();
    await page.getByRole('button', { name: 'Remove Quiet Orbit from Likes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toHaveCount(
      0,
    );
    await page.getByRole('button', { name: 'After hours', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toBeEnabled();
  } finally {
    await desktop.close();
  }
});
