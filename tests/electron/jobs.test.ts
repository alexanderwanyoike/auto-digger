import { _electron as electron, expect, test } from '@playwright/test';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';

test('reports actual subprocess progress, cancels, continues the queue and retries without repeating completed tracks', async () => {
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
    const started = await page.evaluate(
      async (release) =>
        window.downloadJobs?.start([
          {
            release: {
              ...release,
              videos: [{ title: 'Quiet Orbit', url: 'https://youtu.be/slowvideo01' }],
            },
            videoIndex: 0,
            trackIndex: 0,
          },
          { release: { ...release, id: 13 }, videoIndex: 0, trackIndex: 0 },
        ]),
      loadedRelease,
    );
    expect(started).toMatchObject({ ok: true });
    if (!started?.ok) throw new Error('No download jobs');
    const first = started.value[0];
    const second = started.value[1];
    if (!first || !second) throw new Error('Missing jobs');
    await expect
      .poll(async () => {
        const jobs = await page.evaluate(async () => window.downloadJobs?.list());
        return jobs?.ok ? jobs.value.find((job) => job.id === first.id)?.percent : null;
      })
      .toBe(25);
    await page.evaluate(async (id) => window.downloadJobs?.cancel(id), first.id);
    await expect
      .poll(async () => {
        const jobs = await page.evaluate(async () => window.downloadJobs?.list());
        return jobs?.ok ? jobs.value.find((job) => job.id === second.id)?.stage : null;
      })
      .toBe('complete');
    expect(await page.evaluate(async () => window.downloadJobs?.list())).toMatchObject({
      ok: true,
      value: [{ stage: 'cancelled' }, { stage: 'complete' }],
    });
    await page.evaluate(async (id) => window.downloadJobs?.retry(id), first.id);
    await expect
      .poll(async () => {
        const jobs = await page.evaluate(async () => window.downloadJobs?.list());
        return jobs?.ok ? jobs.value.find((job) => job.id === first.id)?.stage : null;
      })
      .toBe('complete');
    expect(await page.evaluate(async () => window.audioLibrary?.list())).toMatchObject({
      ok: true,
      value: [{ releaseId: 12 }, { releaseId: 13 }],
    });
    const music = await desktop.evaluate(({ app }) => app.getPath('music'));
    expect(
      (await readdir(join(music, 'Auto Digger'))).filter((name) => name.startsWith('.download-')),
    ).toEqual([]);
  } finally {
    await desktop.close();
  }
});

test('reviews album source coverage, downloads one source per track and shows queue actions in the UI', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('batch-profile')}`,
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
    await page.evaluate(async (release) => window.catalogue?.add({ crateId: 'default', release }), {
      ...loadedRelease,
      formats: ['Album'],
      tracks: [
        ...loadedRelease.tracks,
        { position: 'B1', title: 'Evening Mix', duration: '' },
        { position: 'B2', title: 'No source', duration: '' },
      ],
      videos: [
        { title: 'Quiet Orbit', url: 'https://youtu.be/slowvideo01' },
        { title: 'Quiet Orbit alternative', url: 'https://youtu.be/abcdefghijk' },
        { title: 'Evening Mix', url: 'https://youtu.be/lmnopqrstuv' },
      ],
    });
    await page.reload();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    const sources = page.getByRole('region', { name: 'Audio sources' });
    await expect(
      sources.getByRole('button', { name: 'Download audio', exact: true }).last(),
    ).toBeEnabled();
    await sources
      .getByRole('list', { name: 'YouTube audio sources' })
      .getByRole('listitem')
      .nth(2)
      .getByLabel('Discogs track')
      .selectOption('1');
    await page.getByText('Review track coverage', { exact: true }).click();
    await page.getByLabel('Source for A1 Quiet Orbit', { exact: true }).selectOption('0');
    await expect(page.getByText('No source available', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Download 2 available tracks', exact: true }).click();
    await expect(
      page.getByRole('progressbar', { name: 'Progress for Quiet Orbit', exact: true }),
    ).toHaveAttribute('aria-valuenow', '25');
    await page.getByRole('button', { name: 'Cancel download Quiet Orbit', exact: true }).click();
    await page.getByRole('button', { name: 'Downloads', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Retry download Quiet Orbit', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Retry download Quiet Orbit', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Play Evening Mix', exact: true })).toBeEnabled();
    const tracks = await page.evaluate(async () => window.audioLibrary?.list());
    expect(tracks).toMatchObject({ ok: true });
    if (!tracks?.ok) throw new Error('No saved tracks');
    await expect(
      page.getByText(
        '1 saved, 0 failed, 1 cancelled. Completed tracks have been kept. Retry the others in the download queue.',
        { exact: true },
      ),
    ).toHaveCount(0);
    expect(tracks.value).toHaveLength(2);
    expect(tracks.value.map((track) => track.videoId).sort()).toEqual([
      'lmnopqrstuv',
      'slowvideo01',
    ]);
    await page.screenshot({ path: 'test-results/download-queue.png' });
  } finally {
    await desktop.close();
  }
});
