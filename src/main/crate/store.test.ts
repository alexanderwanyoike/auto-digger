import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createCrateStore } from './store';
import { loadedRelease } from '../../../tests/discogsFixtures';

test('persists whole EPs across store instances, preserves order and prevents duplicates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-crate-'));
  try {
    const file = join(directory, 'crate.json');
    const store = createCrateStore(file);
    expect(await store.list()).toEqual({ ok: true, value: [] });
    expect(await store.save(loadedRelease)).toEqual({ ok: true, value: [loadedRelease] });
    await store.save({ ...loadedRelease, title: 'Duplicate must retain the first saved metadata' });
    const reopened = createCrateStore(file);
    expect(await reopened.list()).toEqual({ ok: true, value: [loadedRelease] });
    await reopened.save({ ...loadedRelease, id: 13 });
    expect(await reopened.remove(12)).toEqual({ ok: true, value: [{ ...loadedRelease, id: 13 }] });
    expect(await createCrateStore(file).list()).toEqual({
      ok: true,
      value: [{ ...loadedRelease, id: 13 }],
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('serializes concurrent saves so no EP is lost', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-crate-'));
  try {
    const store = createCrateStore(join(directory, 'crate.json'));
    const releases = Array.from({ length: 8 }, (_, index) => ({ ...loadedRelease, id: index + 1 }));
    const results = await Promise.all(releases.map((release) => store.save(release)));
    expect(results.every((result) => result.ok)).toBe(true);
    expect(await store.list()).toEqual({ ok: true, value: releases });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('preserves corrupt files and reports storage failures without saving', async () => {
  const { writeFile, readFile } = await import('node:fs/promises');
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-crate-'));
  try {
    const file = join(directory, 'crate.json');
    await writeFile(file, 'broken-json');
    const store = createCrateStore(file);
    expect(await store.list()).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
    expect(await store.save(loadedRelease)).toMatchObject({
      ok: false,
      error: { code: 'invalid-data' },
    });
    expect(await readFile(file, 'utf8')).toBe('broken-json');
    const blocked = createCrateStore(join(file, 'crate.json'));
    expect(await blocked.save(loadedRelease)).toMatchObject({
      ok: false,
      error: { code: 'storage' },
    });
    expect(await store.save({ ...loadedRelease, formats: ['LP'] })).toMatchObject({
      ok: false,
      error: { code: 'invalid-input' },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
