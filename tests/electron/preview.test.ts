import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadedRelease } from '../discogsFixtures';

test('starts a progressive preview before delivery completes and leaves the downloads folder empty', async () => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  const desktop = await electron.launch({
    args: [
      resolve('tests/encryptedDesktop.cjs'),
      `--user-data-dir=${test.info().outputPath('preview-profile')}`,
    ],
    env,
  });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    await page.evaluate(async (release) => window.crate?.save(release), loadedRelease);
    await page.reload();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP' }).click();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const player = page.getByRole('contentinfo', { name: 'Playback' });
    await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
    expect(
      await desktop.evaluate(() => {
        const finished: unknown = Reflect.get(globalThis, 'autoDiggerPreviewFinished');
        return finished;
      }),
    ).toBe(false);
    expect(await page.evaluate(async () => window.audioLibrary?.list())).toEqual({
      ok: true,
      value: [],
    });
    await player.getByRole('button', { name: 'Pause', exact: true }).click();
    const seek = player.getByRole('slider', { name: 'Track position' });
    await expect(seek).toBeEnabled();
    await seek.press('Home');
    await seek.press('ArrowRight');
    await player.getByRole('button', { name: 'Stop preview' }).click();
    await expect(player.getByText('Nothing on the deck')).toBeVisible();
    expect(
      await desktop.evaluate(async ({ app }) => {
        const { readdir } = await import('node:fs/promises');
        const { join } = await import('node:path');
        return readdir(join(app.getPath('music'), 'Auto Digger'));
      }),
    ).toEqual([]);
  } finally {
    await desktop.close();
  }
});
