import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { loadedRelease } from '../../../tests/discogsFixtures';
import { createCatalogueStore } from '../catalogue/store';
import { createIndexedLibrary } from './indexedLibrary';

test('imports completed Soulseek audio into the configured library and retains its source across restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-soulseek-'));
  const catalogue = createCatalogueStore(join(directory, 'catalog.sqlite'));
  const source = join(directory, 'peer.flac');
  await writeFile(source, 'original peer audio');
  const candidateId = 'a'.repeat(32);
  const receive = vi.fn(async () => ({
    ok: true as const,
    value: {
      file: source,
      match: {
        id: candidateId,
        username: 'peer',
        filename: 'Music\\Quiet Orbit.flac',
        size: 19,
        bitRate: null,
        length: 372,
        access: 'public' as const,
      },
    },
  }));
  const downloader = { probe: vi.fn(), download: vi.fn() };
  try {
    await catalogue.preferences.save({
      material: 'slate',
      accent: 'blue',
      directory: join(directory, 'Auto Digger'),
      layout: 'custom',
      folders: ['source', 'genre', 'year', 'label', 'artist', 'release'],
    });
    const library = createIndexedLibrary(directory, catalogue, downloader, fetch, receive);
    const input = { provider: 'soulseek', candidateId, release: loadedRelease, trackIndex: 0 };
    const saved = await library.download(input);
    if (!saved.ok) throw new Error(saved.error.message);
    expect(saved).toMatchObject({
      ok: true,
      value: {
        provider: 'soulseek',
        videoId: null,
        title: 'Quiet Orbit',
        soulseek: { username: 'peer', filename: 'Music\\Quiet Orbit.flac' },
      },
    });
    const located = await library.locate(saved.value.id);
    if (!located.ok) throw new Error(located.error.message);
    expect(dirname(located.value.file)).toBe(
      join(
        directory,
        'Auto Digger',
        'Soulseek',
        'Electronic',
        '1998',
        'Still Records',
        'Low Tide',
        'Low Tide - Quiet Orbit EP [r12]',
      ),
    );
    expect(await readFile(located.value.file, 'utf8')).toBe('original peer audio');
    expect(await readFile(source, 'utf8')).toBe('original peer audio');
    expect(await library.download(input)).toEqual(saved);
    expect(receive).toHaveBeenCalledTimes(1);
    await catalogue.close();
    const reopened = createCatalogueStore(join(directory, 'catalog.sqlite'));
    try {
      expect(
        await createIndexedLibrary(directory, reopened, downloader).locate(saved.value.id),
      ).toEqual(located);
    } finally {
      await reopened.close();
    }
  } finally {
    await catalogue.close();
    await rm(directory, { recursive: true, force: true });
  }
});
