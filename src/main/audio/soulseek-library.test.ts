import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { createCatalogueStore } from '../catalogue/store';
import { createIndexedLibrary } from './indexed-library';
import { importSoulseekAudio } from './soulseek-library';

test('preserves existing audio when recovery metadata is missing and a new import collides', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-import-collision-'));
  const file = join(directory, 'incoming.flac');
  const candidateId = 'c'.repeat(32);
  const input = {
    provider: 'soulseek' as const,
    candidateId,
    release: loadedRelease,
    trackIndex: 0,
  };
  const receive = () =>
    Promise.resolve({
      ok: true as const,
      value: {
        file,
        match: {
          id: candidateId,
          username: 'peer',
          filename: 'Track.flac',
          size: 5,
          bitRate: null,
          length: null,
          access: 'public' as const,
        },
      },
    });
  try {
    await writeFile(file, 'audio');
    const first = await importSoulseekAudio(directory, input, receive, {});
    if (!first.ok) throw new Error(first.error.message);
    await rm(join(directory, `${first.value.id}.json`));
    await writeFile(file, 'other');
    expect(await importSoulseekAudio(directory, input, receive, {})).toMatchObject({
      ok: false,
      error: { code: 'storage' },
    });
    expect(await readFile(join(directory, first.value.filename), 'utf8')).toBe('audio');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('imports completed Soulseek audio into the configured library and retains its source across restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-soulseek-'));
  const catalogue = createCatalogueStore(join(directory, 'catalog.sqlite'));
  const source = join(directory, 'peer.flac');
  await writeFile(source, 'original peer audio');
  const candidateId = 'a'.repeat(32);
  const receive = vi.fn(() =>
    Promise.resolve({
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
    }),
  );
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

test('saves release-title search audio without inventing a Discogs track assignment', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-release-audio-'));
  const catalogue = createCatalogueStore(join(directory, 'catalog.sqlite'));
  const file = join(directory, 'incoming.flac');
  const candidateId = 'd'.repeat(32);
  const receive = vi.fn(() =>
    Promise.resolve({
      ok: true as const,
      value: {
        file,
        match: {
          id: candidateId,
          username: 'peer',
          filename: 'Music\\Quiet Orbit EP.flac',
          size: 5,
          bitRate: null,
          length: null,
          access: 'public' as const,
        },
      },
    }),
  );
  try {
    await writeFile(file, 'audio');
    const library = createIndexedLibrary(
      directory,
      catalogue,
      { probe: vi.fn(), download: vi.fn() },
      fetch,
      receive,
    );
    const saved = await library.download({
      provider: 'soulseek',
      release: { ...loadedRelease, tracks: [] },
      candidateId,
      trackIndex: null,
    });
    expect(saved).toMatchObject({
      ok: true,
      value: { title: 'Quiet Orbit EP', trackIndex: null, album: 'Quiet Orbit EP' },
    });
    if (!saved.ok) throw new Error(saved.error.message);
    const located = await library.locate(saved.value.id);
    if (!located.ok) throw new Error(located.error.message);
    expect(await readFile(located.value.file, 'utf8')).toBe('audio');
  } finally {
    await catalogue.close();
    await rm(directory, { recursive: true, force: true });
  }
});
