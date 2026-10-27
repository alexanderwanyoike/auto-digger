import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import NodeID3 from 'node-id3';
import { expect, test, vi } from 'vitest';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { createCatalogueStore } from '../catalogue/store';
import { createIndexedLibrary } from './indexed-library';
import { createAudioPreviews } from './previews';

test('previews YouTube outside the library and saves the cached bytes with corrected Discogs tags', async () => {
  const root = await mkdtemp(join(tmpdir(), 'auto-digger-preview-'));
  const catalogue = createCatalogueStore(join(root, 'catalog.sqlite'));
  const download = vi.fn(async (_id: string, file: string) => {
    await writeFile(file, 'original audio payload');
    return { ok: true as const, value: undefined };
  });
  const downloader = {
    probe: vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: { videoId: 'abcdefghijk', title: 'Low Tide Quiet Orbit' },
      }),
    ),
    download,
  };
  const previews = createAudioPreviews(join(root, 'temporary'), downloader);
  const library = createIndexedLibrary(
    join(root, 'library'),
    catalogue,
    downloader,
    fetch,
    undefined,
    previews,
  );
  const release = {
    ...loadedRelease,
    tracks: [...loadedRelease.tracks, { position: 'B1', title: 'Night Tide', duration: '5:00' }],
  };
  const input = { release, videoIndex: 0, trackIndex: 0 };
  try {
    const preview = await previews.prepare(input);
    expect(preview).toMatchObject({ ok: true, value: { title: 'Quiet Orbit' } });
    expect(await library.list()).toEqual({ ok: true, value: [] });
    expect(await previews.prepare(input)).toEqual(preview);
    expect(download).toHaveBeenCalledTimes(1);
    const temporary = await previews.locate('12-abcdefghijk');
    if (!temporary.ok) throw new Error(temporary.error.message);
    const saved = await library.download({ ...input, trackIndex: 1 });
    expect(saved).toMatchObject({ ok: true, value: { title: 'Night Tide', trackIndex: 1 } });
    expect(download).toHaveBeenCalledTimes(1);
    const located = await library.locate('12-abcdefghijk');
    if (!located.ok) throw new Error(located.error.message);
    expect(await NodeID3.Promise.read(located.value.file)).toMatchObject({
      title: 'Night Tide',
      album: 'Quiet Orbit EP',
      artist: 'Low Tide',
      genre: 'Deep House',
      trackNumber: '2',
    });
    expect(
      (await readFile(located.value.file)).includes(Buffer.from('original audio payload')),
    ).toBe(true);
    expect(await previews.locate('12-abcdefghijk')).toEqual(located);
    await expect(readFile(temporary.value.file)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await previews.close();
    await catalogue.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('receives Soulseek audio once, keeps it out of Downloads until saved and retains its encoding', async () => {
  const root = await mkdtemp(join(tmpdir(), 'auto-digger-slsk-preview-'));
  const catalogue = createCatalogueStore(join(root, 'catalog.sqlite'));
  const file = join(root, 'peer.flac');
  const receive = vi.fn(() =>
    Promise.resolve({
      ok: true as const,
      value: {
        file,
        match: {
          id: 'a'.repeat(32),
          username: 'peer',
          filename: 'Quiet Orbit.flac',
          size: 5,
          bitRate: null,
          length: 60,
          access: 'public' as const,
        },
      },
    }),
  );
  const downloader = { probe: vi.fn(), download: vi.fn() };
  const previews = createAudioPreviews(join(root, 'temporary'), downloader, receive);
  const library = createIndexedLibrary(
    join(root, 'library'),
    catalogue,
    downloader,
    fetch,
    receive,
    previews,
  );
  const input = {
    provider: 'soulseek' as const,
    release: loadedRelease,
    trackIndex: 0,
    candidateId: 'a'.repeat(32),
  };
  try {
    await writeFile(file, 'audio');
    const preview = await previews.prepare(input);
    expect(preview).toMatchObject({
      ok: true,
      value: { title: 'Quiet Orbit', provider: 'soulseek' },
    });
    expect(await library.list()).toEqual({ ok: true, value: [] });
    expect(await previews.prepare(input)).toEqual(preview);
    const saved = await library.download(input);
    expect(saved).toMatchObject({
      ok: true,
      value: { provider: 'soulseek', title: 'Quiet Orbit' },
    });
    expect(receive).toHaveBeenCalledTimes(1);
    const located = await library.locate(`12-slsk-${input.candidateId}`);
    if (!located.ok) throw new Error(located.error.message);
    expect(await readFile(located.value.file, 'utf8')).toBe('audio');
    expect(await readFile(file, 'utf8')).toBe('audio');
  } finally {
    await previews.close();
    await catalogue.close();
    await rm(root, { recursive: true, force: true });
  }
});
