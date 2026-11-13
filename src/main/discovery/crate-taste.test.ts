import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { createCatalogueStore } from '../catalogue/store';

test('ranks Discogs styles from new personal memberships once per record across crates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-taste-'));
  const file = join(directory, 'catalog.sqlite');
  const legacy = join(directory, 'crate.json');
  await writeFile(
    legacy,
    JSON.stringify({ version: 1, releases: [{ ...loadedRelease, id: 20, styles: ['Trance'] }] }),
  );
  const store = createCatalogueStore(file, legacy);
  try {
    const created = await store.create('Techno');
    const crateId = created.ok && created.value.crateId;
    if (!crateId) throw new Error('Expected a named crate');
    const add = (id: number, styles: string[], crate = 'default') =>
      store.addPersonal({ crateId: crate, release: { ...loadedRelease, id, styles } });

    await store.add({ crateId: 'default', release: { ...loadedRelease, id: 21, styles: ['Dub'] } });
    await add(20, ['Trance']);
    await add(21, ['Dub']);
    await add(12, ['Deep House', 'Deep House', 'Acid House']);
    await add(12, ['Deep House', 'Acid House'], crateId);
    await add(13, ['Deep House'], crateId);
    await expect(store.crateTaste()).resolves.toEqual({
      ok: true,
      value: [
        { style: 'Deep House', releases: 2 },
        { style: 'Acid House', releases: 1 },
      ],
    });

    await store.remove({ crateId, releaseId: 12 });
    await expect(store.crateTaste()).resolves.toMatchObject({
      ok: true,
      value: [
        { style: 'Deep House', releases: 2 },
        { style: 'Acid House', releases: 1 },
      ],
    });
    await store.deleteCrate(crateId);
    await store.close();
    const reopened = createCatalogueStore(file, legacy);
    try {
      await expect(reopened.crateTaste()).resolves.toEqual({
        ok: true,
        value: [
          { style: 'Acid House', releases: 1 },
          { style: 'Deep House', releases: 1 },
        ],
      });
      await reopened.remove({ crateId: 'default', releaseId: 12 });
      await expect(reopened.crateTaste()).resolves.toEqual({ ok: true, value: [] });
    } finally {
      await reopened.close();
    }
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
