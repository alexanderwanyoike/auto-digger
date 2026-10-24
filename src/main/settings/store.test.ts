import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createCatalogueStore } from '../catalogue/store';

test('persists validated appearance and download preferences independently of crate metadata', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-settings-'));
  const file = join(directory, 'catalog.sqlite');
  const store = createCatalogueStore(file);
  try {
    expect(await store.preferences.read()).toMatchObject({
      ok: true,
      value: { material: 'aluminium', accent: 'blue', layout: 'flat', directory: null },
    });
    expect(
      await store.preferences.save({
        material: 'ceramic',
        accent: 'teal',
        layout: 'release',
        directory,
      }),
    ).toMatchObject({ ok: true });
    expect(
      await store.preferences.save({
        material: 'bad',
        accent: 'teal',
        layout: 'release',
        directory,
      }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
    await store.close();
    const reopened = createCatalogueStore(file);
    try {
      expect(await reopened.preferences.read()).toMatchObject({
        ok: true,
        value: { material: 'ceramic', accent: 'teal', layout: 'release', directory },
      });
      expect(await reopened.view()).toMatchObject({
        ok: true,
        value: { crates: [{ name: 'My crate' }] },
      });
    } finally {
      await reopened.close();
    }
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
