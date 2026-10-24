import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createCatalogueStore } from '../catalogue/store';
import { createLegacyCrateStore } from '../catalogue/legacyCrateStore';
import { loadedRelease } from '../../../tests/discogsFixtures';

test('keeps existing crate operations compatible while SQLite owns membership and ordering', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-crate-'));
  const catalogue = createCatalogueStore(join(directory, 'catalog.sqlite'));
  const store = createLegacyCrateStore(catalogue);
  try {
    expect(await store.list()).toEqual({ ok: true, value: [] });
    const records = Array.from({ length: 8 }, (_, index) => ({ ...loadedRelease, id: index + 1 }));
    const results = await Promise.all(records.map((record) => store.save(record)));
    expect(results.every((result) => result.ok)).toBe(true);
    await store.save(records[0]);
    expect(await store.list()).toEqual({ ok: true, value: records });
    expect(await store.remove(1)).toEqual({ ok: true, value: records.slice(1) });
    expect(await store.save({ ...loadedRelease, formats: ['Album'] })).toMatchObject({ ok: true });
    expect(await store.save({ id: 1 })).toMatchObject({
      ok: false,
      error: { code: 'invalid-input' },
    });
  } finally {
    await catalogue.close();
    await rm(directory, { recursive: true, force: true });
  }
});
