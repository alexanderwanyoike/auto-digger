import { _electron as electron, expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';

test('migrates the crate and persists named crate track annotations through isolated IPC and restarts', async () => {
  const profile = test.info().outputPath('catalogue-profile');
  await mkdir(profile, { recursive: true });
  const legacy = JSON.stringify({ version: 1, releases: [loadedRelease] });
  await writeFile(join(profile, 'crate.json'), legacy);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  const options = {
    args: [resolve('tests/encrypted-desktop.cjs'), `--user-data-dir=${profile}`],
    env,
  };
  let desktop = await electron.launch(options);
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    expect(await page.evaluate(async () => window.catalogue?.view())).toMatchObject({
      ok: true,
      value: { entries: [{ release: { id: 12 } }] },
    });
    const id = await page.evaluate(
      async (release) => {
        const created = await window.catalogue?.create('H-Foundation picks');
        if (!created?.ok || !created.value.crateId) throw new Error('No crate');
        const { crateId } = created.value;
        const added = await window.catalogue?.add({ crateId, release });
        if (!added?.ok) throw new Error('No release');
        const track = added.value.entries[0]?.tracks[0];
        if (!track) throw new Error('No track');
        const marked = await window.catalogue?.annotate({
          crateId,
          releaseId: release.id,
          trackKey: track.key,
          picked: true,
          tags: ['dub'],
        });
        if (!marked?.ok) throw new Error('No annotation');
        return crateId;
      },
      { ...loadedRelease, formats: ['Album'] },
    );
    expect(await readFile(join(profile, 'crate.json.bak'), 'utf8')).toBe(legacy);
    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    expect(
      await page.evaluate(async (crateId) => window.catalogue?.view(crateId), id),
    ).toMatchObject({
      ok: true,
      value: { entries: [{ tracks: [{ picked: true, tags: ['dub'] }] }] },
    });
    expect(await page.evaluate(async () => window.crate?.list())).toMatchObject({
      ok: true,
      value: [{ id: 12 }],
    });
  } finally {
    await desktop.close();
  }
});
