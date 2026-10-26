import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createCatalogueStore } from './store';
import { loadedRelease } from '../../../tests/discogs-fixtures';

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
    const { crateId } = created.value;
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

test('persists independent track picks and personal tags per crate without changing release metadata', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-catalogue-'));
  const file = join(directory, 'catalog.sqlite');
  const store = createCatalogueStore(file);
  try {
    await store.add({ crateId: 'default', release: loadedRelease });
    const other = await store.create('Warm-up');
    if (!other.ok || !other.value.crateId) throw new Error('Expected another crate');
    const { crateId } = other.value;
    const added = await store.add({ crateId, release: loadedRelease });
    if (!added.ok) throw new Error('Expected saved release');
    const track = added.value.entries[0]?.tracks[0];
    if (!track) throw new Error('Expected selectable track');
    const marked = await store.annotate({
      crateId,
      releaseId: 12,
      trackKey: track.key,
      picked: true,
      tags: [' Warm-up ', 'dub', 'DUB'],
    });
    expect(marked).toMatchObject({
      ok: true,
      value: {
        entries: [
          {
            release: loadedRelease,
            tracks: [{ key: track.key, picked: true, tags: ['Warm-up', 'dub'] }],
          },
        ],
      },
    });
    expect(await store.view('default')).toMatchObject({
      ok: true,
      value: { entries: [{ tracks: [{ picked: false, tags: [] }] }] },
    });
    await store.close();
    const reopened = createCatalogueStore(file);
    try {
      expect(await reopened.view(crateId)).toMatchObject({
        ok: true,
        value: {
          entries: [{ tracks: [{ key: track.key, picked: true, tags: ['Warm-up', 'dub'] }] }],
        },
      });
      expect(
        await reopened.annotate({
          crateId,
          releaseId: 12,
          trackKey: 'invalid',
          picked: true,
          tags: [],
        }),
      ).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
    } finally {
      await reopened.close();
    }
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('allows concurrent first opens and backs up an existing empty legacy crate', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-catalogue-'));
  const legacy = join(directory, 'crate.json');
  const original = JSON.stringify({ version: 1, releases: [] });
  await writeFile(legacy, original);
  const file = join(directory, 'catalog.sqlite');
  const first = createCatalogueStore(file, legacy);
  const second = createCatalogueStore(file, legacy);
  try {
    const views = await Promise.all([first.view(), second.view()]);
    expect(views.every((result) => result.ok)).toBe(true);
    expect(await readFile(`${legacy}.bak`, 'utf8')).toBe(original);
  } finally {
    await first.close();
    await second.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('preserves corrupt legacy data and rejects unsupported database versions', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-catalogue-'));
  const legacy = join(directory, 'crate.json');
  await writeFile(legacy, 'broken catalogue');
  const corrupt = createCatalogueStore(join(directory, 'catalog.sqlite'), legacy);
  try {
    expect(await corrupt.view()).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
    expect(await readFile(legacy, 'utf8')).toBe('broken catalogue');
    const file = join(directory, 'future.sqlite');
    const future = new DatabaseSync(file);
    future.exec('PRAGMA user_version=99');
    future.close();
    const bytes = await readFile(file);
    const store = createCatalogueStore(file);
    try {
      expect(await store.view()).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
      expect(await readFile(file)).toEqual(bytes);
    } finally {
      await store.close();
    }
  } finally {
    await corrupt.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('returns typed failures for invalid crate selection and operations after close', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-catalogue-'));
  const store = createCatalogueStore(join(directory, 'catalog.sqlite'));
  try {
    expect(await store.view('')).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
    await store.close();
    expect(await store.create('After close')).toMatchObject({
      ok: false,
      error: { code: 'unavailable' },
    });
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('retries a failed initial open after the legacy file is repaired', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-catalogue-'));
  const legacy = join(directory, 'crate.json');
  await writeFile(legacy, 'broken');
  const store = createCatalogueStore(join(directory, 'catalog.sqlite'), legacy);
  try {
    expect((await store.view()).ok).toBe(false);
    await writeFile(legacy, JSON.stringify({ version: 1, releases: [loadedRelease] }));
    expect(await store.view()).toMatchObject({
      ok: true,
      value: { entries: [{ release: { id: 12 } }] },
    });
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('marks identical unnamed tracks independently', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-catalogue-'));
  const store = createCatalogueStore(join(directory, 'catalog.sqlite'));
  try {
    const release = {
      ...loadedRelease,
      tracks: [
        { position: '', title: 'Untitled', duration: '' },
        { position: '', title: 'Untitled', duration: '' },
      ],
    };
    const saved = await store.add({ crateId: 'default', release });
    if (!saved.ok) throw new Error('No release');
    const tracks = saved.value.entries[0]?.tracks;
    expect(new Set(tracks?.map((track) => track.key)).size).toBe(2);
    const marked = await store.annotate({
      crateId: 'default',
      releaseId: release.id,
      trackKey: tracks?.[1]?.key,
      picked: true,
      tags: ['dub'],
    });
    expect(marked).toMatchObject({
      ok: true,
      value: {
        entries: [
          {
            tracks: [
              { picked: false, tags: [] },
              { picked: true, tags: ['dub'] },
            ],
          },
        ],
      },
    });
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('preserves a malformed existing SQLite schema without creating missing tables', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-catalogue-'));
  const file = join(directory, 'catalog.sqlite');
  const database = new DatabaseSync(file);
  database.exec('CREATE TABLE crates(id TEXT PRIMARY KEY); PRAGMA user_version=1');
  database.close();
  const original = await readFile(file);
  const store = createCatalogueStore(file);
  try {
    expect((await store.view()).ok).toBe(false);
    expect(await readFile(file)).toEqual(original);
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
