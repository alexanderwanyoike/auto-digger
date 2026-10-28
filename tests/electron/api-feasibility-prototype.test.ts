import { _electron as electron, expect, test } from '@playwright/test';
import { join, resolve } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';

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
      AUTO_DIGGER_API_PROTOTYPE_USE_PROFILE: '0',
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

test('explicit profile reuse keeps the existing crate, music path and app identity while enabling Cosine', async () => {
  const profile = test.info().outputPath('existing-profile');
  const options = {
    args: [resolve('tests/encrypted-desktop.cjs'), `--user-data-dir=${profile}`],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      AUTO_DIGGER_API_PROTOTYPE: '0',
      AUTO_DIGGER_API_PROTOTYPE_USE_PROFILE: '0',
    },
  };
  const existing = await electron.launch(options);
  try {
    const page = await existing.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk', exact: true }).waitFor();
    expect(
      await page.evaluate((release) => window.crate?.save(release), loadedRelease),
    ).toMatchObject({ ok: true });
  } finally {
    await existing.close();
  }
  const prototype = await electron.launch({
    ...options,
    env: {
      ...options.env,
      AUTO_DIGGER_API_PROTOTYPE: '1',
      AUTO_DIGGER_API_PROTOTYPE_USE_PROFILE: '1',
    },
  });
  try {
    const page = await prototype.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk', exact: true }).waitFor();
    expect(
      await prototype.evaluate(({ app }) => ({
        name: app.getName(),
        profile: app.getPath('userData'),
        music: app.getPath('music'),
      })),
    ).toEqual({ name: 'Auto Digger', profile, music: join(profile, 'Music') });
    await expect(
      page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('region', { name: 'API feasibility prototype' })).toBeVisible();
    await expect(page.getByLabel('Cosine Club API key')).toBeVisible();
    expect(await page.evaluate(() => window.apiFeasibility?.status())).toEqual({
      ok: true,
      value: { cosine: false, beatport: false, bandcamp: false },
    });
  } finally {
    await prototype.close();
  }
});
