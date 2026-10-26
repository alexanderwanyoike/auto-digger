import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { createCatalogueStore } from '../catalogue/store';
import { createAudioLibrary } from './library';
import { createIndexedLibrary } from './indexed-library';
import { loadedRelease } from '../../../tests/discogs-fixtures';

test('saves new audio using an editable folder template without relocating existing downloads', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-folders-'));
  const catalogue = createCatalogueStore(join(directory, 'catalog.sqlite'));
  const downloader = {
    probe: () =>
      Promise.resolve({
        ok: true as const,
        value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' },
      }),
    download: async (_id: string, file: string) => {
      await writeFile(file, 'audio');
      return { ok: true as const, value: undefined };
    },
  };
  const library = createIndexedLibrary(directory, catalogue, downloader);
  try {
    const old = await library.download({ release: loadedRelease, videoIndex: 0 });
    expect(old.ok).toBe(true);
    expect(
      await catalogue.preferences.save({
        material: 'slate',
        accent: 'blue',
        directory,
        layout: 'custom',
        folderTemplate: 'Archive/<source>/<year> - <genre>/<label>/<artist>/<release>',
      }),
    ).toMatchObject({
      ok: true,
      value: { folderTemplate: 'Archive/<source>/<year> - <genre>/<label>/<artist>/<release>' },
    });
    const release = {
      ...loadedRelease,
      id: 13,
      genres: ['Deep / House'],
      labels: [{ name: 'Still Records', catalogueNumber: 'ST001' }],
    };
    const saved = await library.download({ release, videoIndex: 0 });
    if (!saved.ok) throw new Error(saved.error.message);
    const location = await library.locate(saved.value.id);
    expect(location).toMatchObject({
      ok: true,
      value: {
        file: join(
          directory,
          'Archive',
          'YouTube',
          '1998 - Deep  House',
          'Still Records',
          'Low Tide',
          'Quiet Orbit EP [r13]',
          saved.value.filename,
        ),
      },
    });
    expect(await library.download({ release: loadedRelease, videoIndex: 0 })).toEqual(old);
    const existing = old.ok ? await library.locate(old.value.id) : old;
    expect(existing).toMatchObject({
      ok: true,
      value: { file: join(directory, old.ok ? old.value.filename : '') },
    });
  } finally {
    await catalogue.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('imports legacy downloads, applies future destination/layout settings and reports missing files individually', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-library-'));
  const oldRoot = join(directory, 'old');
  const newRoot = join(directory, 'new');
  const file = join(directory, 'catalog.sqlite');
  const catalogue = createCatalogueStore(file);
  const downloader = {
    probe: () =>
      Promise.resolve({
        ok: true as const,
        value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' },
      }),
    download: vi.fn(async (_id: string, path: string) => {
      await writeFile(path, 'audio');
      return { ok: true as const, value: undefined };
    }),
  };
  try {
    const legacy = await createAudioLibrary(oldRoot, downloader).download({
      release: loadedRelease,
      videoIndex: 0,
    });
    if (!legacy.ok) throw new Error(legacy.error.message);
    const library = createIndexedLibrary(oldRoot, catalogue, downloader);
    expect(await library.list()).toMatchObject({ ok: true, value: [{ id: legacy.value.id }] });
    await catalogue.preferences.save({
      material: 'slate',
      accent: 'amber',
      directory: newRoot,
      layout: 'release',
    });
    const album = { ...loadedRelease, id: 13, title: '../Night / Drive', formats: ['Album'] };
    const saved = await library.download({ release: album, videoIndex: 0 });
    if (!saved.ok) throw new Error(saved.error.message);
    const located = await library.locate(saved.value.id);
    if (!located.ok) throw new Error(located.error.message);
    expect(dirname(dirname(located.value.file))).toBe(newRoot);
    expect(located.value.file.endsWith('.yt.mp3')).toBe(true);
    await rm(join(dirname(located.value.file), `${saved.value.id}.json`));
    expect(await library.list()).toMatchObject({
      ok: true,
      value: [
        { id: legacy.value.id, missing: false },
        { id: saved.value.id, missing: false },
      ],
    });
    expect(await library.locate(saved.value.id)).toEqual(located);
    expect(await library.download({ release: album, videoIndex: 0 })).toEqual(saved);
    expect(await library.download({ release: loadedRelease, videoIndex: 0 })).toEqual(legacy);
    expect(downloader.download).toHaveBeenCalledTimes(2);
    await rm(join(oldRoot, legacy.value.filename));
    expect(await library.list()).toMatchObject({
      ok: true,
      value: [{ id: legacy.value.id, missing: true }, { id: saved.value.id }],
    });
    expect((await library.locate(legacy.value.id)).ok).toBe(false);
    expect(await library.location(legacy.value.id)).toMatchObject({
      ok: true,
      value: { file: join(oldRoot, legacy.value.filename) },
    });
    await rename(oldRoot, `${oldRoot}-offline`);
    await writeFile(oldRoot, 'unavailable destination');
    expect(await library.list()).toMatchObject({
      ok: true,
      value: [{ missing: true }, { id: saved.value.id, missing: false }],
    });
    await catalogue.close();
    const reopened = createCatalogueStore(file);
    try {
      const restored = createIndexedLibrary(oldRoot, reopened, downloader);
      expect(await restored.list()).toMatchObject({
        ok: true,
        value: [{ missing: true }, { id: saved.value.id }],
      });
      expect(await restored.locate(saved.value.id)).toEqual(located);
    } finally {
      await reopened.close();
    }
  } finally {
    await catalogue.close();
    await rm(directory, { recursive: true, force: true });
  }
});
