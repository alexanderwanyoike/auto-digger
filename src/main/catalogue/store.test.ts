import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createCatalogueStore } from './store';
import { loadedRelease } from '../../../tests/discogsFixtures';

test('migrates the original crate once into SQLite with its metadata, order and original file preserved', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-catalogue-'));
  const original = JSON.stringify({
    version: 1,
    releases: [loadedRelease, { ...loadedRelease, id: 13, title: 'Second EP' }],
  });
  const legacy = join(directory, 'crate.json');
  await writeFile(legacy, original);
  const file = join(directory, 'catalog.sqlite');
  const store = createCatalogueStore(file, legacy);
  try {
    const result = await store.view();
    expect(result).toMatchObject({
      ok: true,
      value: {
        crates: [{ name: 'My crate', releaseCount: 2 }],
        entries: [{ release: { id: 12 } }, { release: { id: 13 } }],
      },
    });
    expect(await readFile(legacy, 'utf8')).toBe(original);
    expect(await readFile(`${legacy}.bak`, 'utf8')).toBe(original);
    expect((await readFile(file)).subarray(0, 16).toString()).toBe('SQLite format 3\u0000');
    await store.close();
    await writeFile(legacy, JSON.stringify({ version: 1, releases: [] }));
    const reopened = createCatalogueStore(file, legacy);
    try {
      expect(await reopened.view()).toMatchObject({
        ok: true,
        value: { entries: [{ release: { id: 12 } }, { release: { id: 13 } }] },
      });
    } finally {
      await reopened.close();
    }
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('keeps named crates independent, accepts albums and preserves unique release membership', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-catalogue-'));
  const store = createCatalogueStore(join(directory, 'catalog.sqlite'));
  try {
    const created = await store.create('H-Foundation picks');
    if (!created.ok || !created.value.crateId) throw new Error('Expected a named crate');
    const crateId = created.value.crateId;
    const album = { ...loadedRelease, formats: ['CD, Album, Mixed'] };
    expect(await store.add({ crateId, release: album })).toMatchObject({
      ok: true,
      value: { entries: [{ release: album }] },
    });
    await store.add({ crateId, release: album });
    expect(await store.view(crateId)).toMatchObject({
      ok: true,
      value: {
        crates: [
          { name: 'My crate', releaseCount: 0 },
          { name: 'H-Foundation picks', releaseCount: 1 },
        ],
        entries: [{ release: album }],
      },
    });
    expect(await store.view('default')).toMatchObject({ ok: true, value: { entries: [] } });
    expect(await store.create('h-foundation PICKS')).toMatchObject({
      ok: false,
      error: { code: 'invalid-input' },
    });
    expect(await store.rename({ crateId, name: 'Night drive' })).toMatchObject({
      ok: true,
      value: { crates: [{ name: 'My crate' }, { name: 'Night drive' }] },
    });
    expect(await store.remove({ crateId, releaseId: album.id })).toMatchObject({
      ok: true,
      value: { entries: [] },
    });
    expect(await store.deleteCrate(crateId)).toMatchObject({
      ok: true,
      value: { crates: [{ name: 'My crate' }] },
    });
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
