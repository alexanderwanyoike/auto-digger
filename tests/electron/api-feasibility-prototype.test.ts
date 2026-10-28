import { _electron as electron, expect, test } from '@playwright/test';
import { join, resolve } from 'node:path';

test('isolates simultaneous API experiments from each other and from real music', async () => {
  const options = {
    args: [resolve('out/main/index.js')],
    timeout: 5000,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      AUTO_DIGGER_API_PROTOTYPE: '1',
    },
  };
  const first = await electron.launch(options);
  try {
    const second = await electron.launch(options);
    try {
      const paths = await Promise.all(
        [first, second].map((desktop) =>
          desktop.evaluate(({ app }) => ({
            profile: app.getPath('userData'),
            music: app.getPath('music'),
            temporary: app.getPath('temp'),
          })),
        ),
      );
      expect(paths[0]?.profile).not.toBe(paths[1]?.profile);
      paths.forEach((pathsForApp) => {
        expect(
          pathsForApp.profile.startsWith(join(pathsForApp.temporary, 'auto-digger-api-prototype-')),
        ).toBe(true);
        expect(pathsForApp.music).toBe(join(pathsForApp.profile, 'Music'));
      });
      const page = await first.firstWindow();
      await page.getByRole('heading', { name: 'Digging desk', exact: true }).waitFor();
      const library = await page.evaluate(async () => window.audioLibrary?.list());
      expect(library).toEqual({ ok: true, value: [] });
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await expect(page.getByRole('region', { name: 'API feasibility prototype' })).toBeVisible();
      await page.getByLabel('Cosine Club API key').fill('synthetic-session-key');
      await page.getByRole('button', { name: 'Use for this session', exact: true }).click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Cosine Club credential set' }),
      ).toBeVisible();
      await expect(page.getByLabel('Cosine Club API key')).toHaveValue('');
      const other = await second.firstWindow();
      await other.getByRole('heading', { name: 'Digging desk', exact: true }).waitFor();
      expect(await other.evaluate(async () => window.apiFeasibility?.status())).toEqual({
        ok: true,
        value: { cosine: false, beatport: false, bandcamp: false },
      });
      await page.reload();
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Cosine Club credential set' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Forget session keys', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: 'No credential set' })).toBeVisible();
    } finally {
      await second.close();
    }
  } finally {
    await first.close();
  }
});
