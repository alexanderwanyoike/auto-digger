import { _electron as electron, expect, test } from '@playwright/test';
import { join, resolve } from 'node:path';
import { selectAppearance } from '../appearance';
import { seedLibrary } from '../library-fixtures';
import { loadedRelease } from '../discogs-fixtures';

[900, 1180].forEach((width) => {
  test(`uses one searchable track list with inline activity at ${width.toString()}px`, async () => {
    const desktop = await electron.launch({
      args: [
        resolve('tests/encrypted-desktop.cjs'),
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
      const music = await desktop.evaluate(({ app }) => app.getPath('music'));
      await seedLibrary(join(music, 'Auto Digger'));
      await page.route('https://i.discogs.com/**', async (route) => {
        const palette = ['#344e55', '#675e4c', '#454259', '#54614c', '#3a485e', '#6c504a'];
        const index = Number(/fixture-(\d)/.exec(route.request().url())?.[1] ?? 0);
        await route.fulfill({
          contentType: 'image/svg+xml',
          body: `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280"><rect width="280" height="280" fill="${palette[index] ?? '#344e55'}"/><circle cx="160" cy="120" r="78" fill="none" stroke="#e0d8c4" stroke-width="2"/><path d="M30 230h220M30 242h100" stroke="#e0d8c4" stroke-width="4"/></svg>`,
        });
      });
      await page.evaluate(
        async (release) => window.catalogue?.add({ crateId: 'default', release }),
        { ...loadedRelease, id: 200, artworkUrl: 'https://i.discogs.com/library-fixture-0.jpg' },
      );
      await page.reload();
      await page.setViewportSize({ width, height: 780 });
      await page.getByRole('button', { name: 'Downloads', exact: true }).click();
      const library = page.getByRole('region', { name: 'Downloaded library' });
      const table = library.getByRole('table', { name: 'Tracks' });
      await expect(table).toBeVisible();
      await expect(table.getByRole('row')).toHaveCount(7);
      await expect(library.getByRole('heading', { name: 'Download queue' })).toHaveCount(0);
      await expect(
        library.getByText('The records you committed to. Ready to play offline.'),
      ).toHaveCount(0);
      await page.getByLabel('Search downloads').fill('northern');
      await expect(table.getByRole('row')).toHaveCount(3);
      await page.getByLabel('Search downloads').fill('nothing-matches');
      await expect(page.getByText('No tracks match this search.', { exact: true })).toBeVisible();
      await page.getByLabel('Search downloads').clear();
      const cached = await page.evaluate(
        async (release) =>
          window.downloadJobs?.start([
            { release: { ...release, id: 200 }, videoIndex: 0, trackIndex: 0 },
          ]),
        loadedRelease,
      );
      if (!cached?.ok) throw new Error('No cached job');
      await expect
        .poll(async () => {
          const jobs = await page.evaluate(async () => window.downloadJobs?.list());
          return jobs?.ok ? jobs.value[0]?.stage : null;
        })
        .toBe('complete');
      await expect(table.getByRole('row')).toHaveCount(7);
      const active = await page.evaluate(
        async (release) =>
          window.downloadJobs?.start([
            {
              release: {
                ...release,
                id: 222,
                title: 'Night Sessions',
                tracks: [{ position: 'A1', title: 'Still Motion', duration: '' }],
                artworkUrl: 'https://i.discogs.com/library-fixture-0.jpg',
                videos: [{ title: 'Still Motion', url: 'https://youtu.be/slowvideo01' }],
              },
              videoIndex: 0,
              trackIndex: 0,
            },
          ]),
        loadedRelease,
      );
      if (!active?.ok) throw new Error('No active job');
      const pending = table.getByRole('row').filter({ hasText: 'Still Motion' });
      await expect(pending.getByRole('cell', { name: 'Low Tide', exact: true })).toBeVisible();
      await expect(
        pending.getByRole('cell', { name: 'Night Sessions', exact: true }),
      ).toBeVisible();
      await pending
        .getByRole('button', { name: 'Cancel download Still Motion', exact: true })
        .click();
      await expect(
        pending.getByRole('button', { name: 'Retry download Still Motion', exact: true }),
      ).toBeVisible();
      await table.getByRole('button', { name: 'Play Quiet Orbit', exact: true }).click();
      const player = page.getByRole('contentinfo', { name: 'Playback' });
      await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
      await player.getByRole('button', { name: 'Pause', exact: true }).click();
      await selectAppearance(page, 'Light');
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.screenshot({ path: `test-results/library-${width.toString()}-light.png` });
      await selectAppearance(page, 'Dark');
      await page.screenshot({ path: `test-results/library-${width.toString()}-dark.png` });
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.screenshot({ path: `test-results/flat-settings-${width.toString()}.png` });
      await page.getByRole('button', { name: 'Crates', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }),
      ).toBeInViewport();
      await expect(page.getByLabel('Pick Quiet Orbit', { exact: true })).toBeInViewport();
      await page.screenshot({ path: `test-results/flat-crates-${width.toString()}.png` });
      await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
      await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
      await page.screenshot({ path: `test-results/flat-desk-${width.toString()}.png` });
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= window.innerWidth &&
            document.documentElement.scrollHeight <= window.innerHeight,
        ),
      ).toBe(true);
    } finally {
      await desktop.close();
    }
  });
});
