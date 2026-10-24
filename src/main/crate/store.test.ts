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
