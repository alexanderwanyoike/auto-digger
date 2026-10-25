import { _electron as electron, expect } from '@playwright/test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { DiscogsRelease } from '../src/shared/discogs';
import type { Result } from '../src/shared/result';

const release: DiscogsRelease = {
  id: 12,
  title: 'Quiet Orbit EP',
  artists: ['Low Tide'],
  labels: [{ name: 'Still Records', catalogueNumber: 'ST001' }],
  year: 1998,
  country: 'UK',
  genres: ['Electronic'],
  styles: ['Deep House'],
  formats: ['Vinyl, 12", EP'],
  artworkUrl: 'https://i.discogs.com/demo-12.svg',
  tracks: [
    { position: 'A1', title: 'Quiet Orbit', duration: '6:12' },
    { position: 'A2', title: 'Driftwood', duration: '5:48' },
    { position: 'B1', title: 'Quiet Orbit (Evening Dub)', duration: '7:04' },
  ],
  videos: [
    { title: 'Low Tide - Quiet Orbit', url: 'https://www.youtube.com/watch?v=abcdefghijk' },
    { title: 'Low Tide - Driftwood', url: 'https://www.youtube.com/watch?v=lmnopqrstuv' },
  ],
};
const records = [
  release,
  {
    ...release,
    id: 13,
    title: 'Soft Focus',
    artists: ['Mira North'],
    artworkUrl: 'https://i.discogs.com/demo-13.svg',
    year: 2001,
  },
  {
    ...release,
    id: 14,
    title: 'Night Transit',
    artists: ['Parallel Lines'],
    artworkUrl: 'https://i.discogs.com/demo-14.svg',
    year: 1999,
  },
  {
    ...release,
    id: 15,
    title: 'Open Water',
    artists: ['The Long Way'],
    artworkUrl: 'https://i.discogs.com/demo-15.svg',
    year: 2002,
  },
];

async function capture(): Promise<Result<undefined, string>> {
  const profile = await mkdtemp(join(tmpdir(), 'auto-digger-site-'));
  let desktop: Awaited<ReturnType<typeof electron.launch>> | undefined;
  try {
    desktop = await electron.launch({
      args: [resolve('tests/encryptedDesktop.cjs'), `--user-data-dir=${profile}`],
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
          ),
        ),
        AUTO_DIGGER_TEST_IDENTITY: '1',
      },
    });
    const page = await desktop.firstWindow();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.route('https://i.discogs.com/**', async (route) => {
      const id = /demo-(\d+)/.exec(route.request().url())?.[1] ?? '12';
      const colours: Record<string, [string, string]> = {
        '12': ['#b4c1c8', '#304c63'],
        '13': ['#d7c5b5', '#845e46'],
        '14': ['#939f9b', '#344c45'],
        '15': ['#b1b3c8', '#484e76'],
      };
      const [paper, ink] = colours[id] ?? ['#b4c1c8', '#304c63'];
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${paper}"/><path d="M0 420 600 240V600H0Z" fill="${ink}" opacity=".12"/><circle cx="390" cy="320" r="180" fill="none" stroke="${ink}" stroke-width="1"/><circle cx="390" cy="320" r="150" fill="none" stroke="${ink}" stroke-width="1"/><circle cx="390" cy="320" r="120" fill="none" stroke="${ink}" stroke-width="1"/><text x="50" y="82" fill="${ink}" font-family="sans-serif" font-size="19" letter-spacing="5">STILL RECORDS / ${id}</text><text x="50" y="162" fill="${ink}" font-family="sans-serif" font-size="40">${records.find((item) => item.id.toString() === id)?.title ?? 'Quiet Orbit EP'}</text><text x="50" y="548" fill="${ink}" font-family="sans-serif" font-size="14" letter-spacing="4">ORIGINAL DEMO ARTWORK</text></svg>`,
      });
    });
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await page.getByLabel('Personal token').fill('synthetic-site-session');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await page.getByLabel('New crate name').fill('After hours');
    await page.getByRole('button', { name: 'Create crate', exact: true }).click();
    const picker = page.getByRole('combobox', { name: 'Active crate', exact: true });
    await expect(picker).toContainText('After hours (0)');
    const selected = await picker.inputValue();
    const seeded = await page.evaluate(
      async ({ items, crateId }) => {
        const api = window.catalogue;
        if (!api) return { ok: false };
        const saved = await Promise.all(items.map((item) => api.add({ crateId, release: item })));
        const view = await api.view(crateId);
        if (!view.ok) return view;
        const entry = view.value.entries.find((item) => item.release.id === 12);
        const track = entry?.tracks[0];
        if (!track || saved.some((result) => !result.ok)) return { ok: false };
        return api.annotate({
          crateId,
          releaseId: 12,
          trackKey: track.key,
          picked: true,
          tags: ['warm-up', 'deep'],
        });
      },
      { items: records, crateId: selected },
    );
    if (!seeded.ok) return { ok: false, error: 'The demo crate could not be prepared.' };
    await page.reload();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('radio', { name: 'Dark', exact: true }).check();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await expect(
      page.getByRole('img', { name: 'Quiet Orbit EP record sleeve', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .getByRole('img', { name: 'Quiet Orbit EP record sleeve', exact: true })
          .evaluate((image) => (image instanceof HTMLImageElement ? image.naturalWidth : 0)),
      )
      .toBeGreaterThan(0);
    await page.getByLabel('Year', { exact: true }).fill('1998');
    await page.getByLabel('Genre', { exact: true }).fill('Electronic');
    await page.getByRole('option', { name: 'Electronic', exact: true }).click();
    await page.getByLabel('Style', { exact: true }).fill('Deep House');
    await page.getByRole('option', { name: 'Deep House', exact: true }).click();
    await page.getByLabel('Style', { exact: true }).press('Escape');
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const directory = resolve('site/public/images');
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: join(directory, 'digging-desk.jpg'), type: 'jpeg', quality: 94 });
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
    await page.screenshot({ path: join(directory, 'crates.jpg'), type: 'jpeg', quality: 94 });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('radio', { name: 'Light', exact: true }).check();
    await page.screenshot({ path: join(directory, 'appearance.jpg'), type: 'jpeg', quality: 94 });
    return { ok: true, value: undefined };
  } catch (error) {
    return {
      ok: false,
      error: `Site capture failed: ${error instanceof Error ? error.message : 'Unknown capture failure'}`,
    };
  } finally {
    await desktop?.close();
    await rm(profile, { recursive: true, force: true });
  }
}

const result = await capture();
if (!result.ok) {
  process.stderr.write(`${result.error}\n`);
  process.exitCode = 1;
}
