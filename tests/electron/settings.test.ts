import { _electron as electron, expect, test } from '@playwright/test';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';

test('persists settings and finds old and per-release downloads after a native restart', async () => {
  const profile = test.info().outputPath('profile');
  const chosen = test.info().outputPath('chosen-music');
  await mkdir(chosen, { recursive: true });
  const options = {
    args: [resolve('tests/encrypted-desktop.cjs'), `--user-data-dir=${profile}`],
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
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    await page.evaluate(
      async (release) => window.audioLibrary?.download({ release, videoIndex: 0 }),
      loadedRelease,
    );
    await desktop.evaluate(({ dialog }, directory) => {
      Reflect.set(dialog, 'showOpenDialog', () =>
        Promise.resolve({ canceled: false, filePaths: [directory] }),
      );
    }, chosen);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('radio', { name: 'Carbon', exact: true }).check();
    await page.getByRole('radio', { name: 'Green', exact: true }).check();
    await page
      .getByRole('textbox', { name: 'Folder layout', exact: true })
      .fill('<artist> - <release>');
    await page.getByRole('button', { name: 'Save folder layout', exact: true }).click();
    await page.getByRole('button', { name: 'Choose downloads folder', exact: true }).click();
    await expect(page.getByText(chosen, { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-material', 'carbon');
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'green');
    await page.evaluate(
      async (release) => window.audioLibrary?.download({ release, videoIndex: 0 }),
      { ...loadedRelease, id: 13 },
    );
    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    await expect(page.locator('html')).toHaveAttribute('data-material', 'carbon');
    const music = await desktop.evaluate(({ app }) => app.getPath('music'));
    const tracks = await page.evaluate(async () => window.audioLibrary?.list());
    if (!tracks?.ok || !tracks.value[0] || !tracks.value[1])
      throw new Error('Expected both downloads');
    await rm(join(music, 'Auto Digger', tracks.value[0].filename));
    await page.reload();
    await page.getByRole('button', { name: 'Downloads', exact: true }).click();
    await expect(page.getByText('File missing or unavailable', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Play Quiet Orbit', exact: true }).last(),
    ).toBeEnabled();
    const file = join(chosen, `Low Tide - Quiet Orbit EP [r13]`, tracks.value[1].filename);
    expect((await readFile(file)).length).toBeGreaterThan(0);
    const status = await desktop.evaluate(async ({ net }, id) => {
      const response = await net.fetch(`auto-digger-audio://track/${id}`, {
        headers: { Range: 'bytes=0-63' },
      });
      return response.status;
    }, tracks.value[1].id);
    expect(status).toBe(206);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.screenshot({ path: 'test-results/settings-material.png' });
  } finally {
    await desktop.close();
  }
});

test('keeps small text and accent actions readable across supported materials, accents and modes', async () => {
  test.setTimeout(60_000);
  const { contrast } = await import('../contrast');
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('appearance-profile')}`,
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
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const accentNames: Record<string, string> = { electric: 'Electric blue', pink: 'Hot pink' };
    const choices = ['light', 'dark'].flatMap((mode) =>
      ['aluminium', 'ceramic', 'slate', 'graphite', 'paper', 'copper', 'carbon'].flatMap(
        (material) =>
          [
            'blue',
            'teal',
            'amber',
            'coral',
            'sage',
            'lilac',
            'rose',
            'electric',
            'green',
            'orange',
            'pink',
            'violet',
          ].map((accent) => ({
            mode,
            material,
            accent,
          })),
      ),
    );
    await choices.reduce<Promise<void>>(
      (previous, choice) =>
        previous.then(async () => {
          await page.getByRole('radio', { name: new RegExp(`^${choice.mode}$`, 'i') }).check();
          await page
            .getByRole('group', { name: 'Material', exact: true })
            .getByRole('radio', { name: new RegExp(choice.material, 'i') })
            .check();
          await page
            .getByRole('group', { name: 'Accent colour', exact: true })
            .getByRole('radio', {
              name: new RegExp(`^${accentNames[choice.accent] ?? choice.accent}$`, 'i'),
            })
            .check();
          await expect(page.locator('html')).toHaveAttribute('data-accent', choice.accent);
          const colors = await page.evaluate(() => {
            const style = getComputedStyle(document.documentElement);
            return {
              muted: style.getPropertyValue('--muted').trim(),
              surface: style.getPropertyValue('--surface').trim(),
              raised: style.getPropertyValue('--surface-raised').trim(),
              accent: style.getPropertyValue('--blue').trim(),
              soft: style.getPropertyValue('--blue-soft').trim(),
            };
          });
          expect(
            contrast(colors.muted, colors.surface),
            JSON.stringify(choice),
          ).toBeGreaterThanOrEqual(4.5);
          expect(
            contrast(colors.muted, colors.raised),
            JSON.stringify(choice),
          ).toBeGreaterThanOrEqual(4.5);
          expect(
            contrast(colors.accent, colors.soft),
            JSON.stringify(choice),
          ).toBeGreaterThanOrEqual(4.5);
        }),
      Promise.resolve(),
    );
  } finally {
    await desktop.close();
  }
});
