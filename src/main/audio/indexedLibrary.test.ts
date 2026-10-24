import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { createCatalogueStore } from '../catalogue/store';
import { createAudioLibrary } from './library';
import { createIndexedLibrary } from './indexedLibrary';
import { loadedRelease } from '../../../tests/discogsFixtures';

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
    expect(await library.download({ release: loadedRelease, videoIndex: 0 })).toEqual(legacy);
    expect(downloader.download).toHaveBeenCalledTimes(2);
    await rm(join(oldRoot, legacy.value.filename));
    expect(await library.list()).toMatchObject({
      ok: true,
      value: [{ id: legacy.value.id, missing: true }, { id: saved.value.id }],
    });
    expect((await library.locate(legacy.value.id)).ok).toBe(false);
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
