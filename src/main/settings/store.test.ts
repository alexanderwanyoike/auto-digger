import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createCatalogueStore } from '../catalogue/store';

test('restores a saved folder template and keeps it when invalid edits are rejected', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-template-settings-'));
  const file = join(directory, 'catalog.sqlite');
  const store = createCatalogueStore(file);
  const preferences = {
    material: 'slate',
    accent: 'blue',
    layout: 'custom',
    folderTemplate: '<source>/<artist>/<year> - <release>',
    directory,
  };
  try {
    expect(await store.preferences.save(preferences)).toMatchObject({
      ok: true,
      value: { folderTemplate: preferences.folderTemplate },
    });
    expect(
      await store.preferences.save({ ...preferences, folderTemplate: '../<artist>' }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
    await store.close();
    const reopened = createCatalogueStore(file);
    try {
      expect(await reopened.preferences.read()).toMatchObject({
        ok: true,
        value: { folderTemplate: preferences.folderTemplate },
      });
    } finally {
      await reopened.close();
    }
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

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

test('keeps an expanded material and accent after reopening existing settings', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-expanded-settings-'));
  const file = join(directory, 'catalog.sqlite');
  const store = createCatalogueStore(file);
  try {
    expect(
      await store.preferences.save({
        material: 'paper',
        accent: 'rose',
        layout: 'flat',
        directory: null,
      }),
    ).toMatchObject({ ok: true });
    await store.close();
    const reopened = createCatalogueStore(file);
    try {
      expect(await reopened.preferences.read()).toMatchObject({
        ok: true,
        value: { material: 'paper', accent: 'rose' },
      });
    } finally {
      await reopened.close();
    }
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
