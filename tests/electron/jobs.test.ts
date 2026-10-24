import { _electron as electron, expect, test } from '@playwright/test';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadedRelease } from '../discogsFixtures';

test('reports actual subprocess progress, cancels, continues the queue and retries without repeating completed tracks', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encryptedDesktop.cjs'),
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
