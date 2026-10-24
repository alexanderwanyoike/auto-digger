import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import NodeID3 from 'node-id3';
import { expect, test, vi } from 'vitest';
import { createAudioLibrary } from './library';
import { loadedRelease } from '../../../tests/discogsFixtures';

test('persists separate videos, avoids duplicate downloads and applies the chosen Discogs track', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-audio-'));
  const release = {
    ...loadedRelease,
    tracks: [...loadedRelease.tracks, { position: 'B1', title: 'Evening Mix', duration: '5:00' }],
    videos: [
      ...loadedRelease.videos,
      { title: 'Unknown upload', url: 'https://youtu.be/lmnopqrstuv' },
    ],
  };
  const downloader = {
    probe: vi.fn((url: string) =>
      Promise.resolve({
        ok: true as const,
        value: {
          videoId: url.includes('lmnopqrstuv') ? 'lmnopqrstuv' : 'abcdefghijk',
          title: url.includes('lmnopqrstuv') ? 'Unknown upload' : 'Low Tide - Quiet Orbit',
        },
      }),
    ),
    download: vi.fn(async (_id: string, file: string) => {
      await writeFile(file, 'audio');
      return { ok: true as const, value: undefined };
    }),
  };
  try {
    const library = createAudioLibrary(directory, downloader);
    const first = await library.download({ release, videoIndex: 0 });
    expect(first).toMatchObject({
      ok: true,
      value: {
        title: 'Quiet Orbit',
        id: '12-abcdefghijk',
      },
    });
    const second = await library.download({ release, videoIndex: 1, trackIndex: 1 });
    expect(second).toMatchObject({
      ok: true,
      value: { title: 'Evening Mix', id: '12-lmnopqrstuv' },
    });
    expect(await createAudioLibrary(directory, downloader).list()).toMatchObject({
      ok: true,
      value: [
        expect.objectContaining({ title: 'Quiet Orbit' }),
        expect.objectContaining({ title: 'Evening Mix' }),
      ],
    });
    expect(await library.download({ release, videoIndex: 0 })).toEqual(first);
    expect(downloader.download).toHaveBeenCalledTimes(2);
    if (!second.ok) throw new Error('Expected successful download');
    expect(await NodeID3.Promise.read(join(directory, second.value.filename))).toMatchObject({
      title: 'Evening Mix',
      trackNumber: '2',
    });
    expect(await library.download({ release, videoIndex: 9 })).toMatchObject({
      ok: false,
      error: { code: 'invalid-input' },
    });
    expect((await readdir(directory)).some((file) => file.startsWith('.download'))).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reuses saved audio offline and cleans incomplete downloads without publishing them', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-audio-'));
  const probe = vi
    .fn<ReturnType<typeof import('./downloader').createDownloader>['probe']>()
    .mockResolvedValue({ ok: true, value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' } });
  const download = vi
    .fn<ReturnType<typeof import('./downloader').createDownloader>['download']>()
    .mockImplementation(async (_id, file) => {
      await writeFile(file, 'audio');
      return { ok: true, value: undefined };
    });
  try {
    const library = createAudioLibrary(directory, { probe, download });
    const first = await library.download({ release: loadedRelease, videoIndex: 0 });
    probe.mockResolvedValue({ ok: false, error: { code: 'network', message: 'offline' } });
    expect(await library.download({ release: loadedRelease, videoIndex: 0 })).toEqual(first);
    expect(probe).toHaveBeenCalledTimes(1);
    probe.mockResolvedValue({ ok: true, value: { videoId: 'lmnopqrstuv', title: 'Second' } });
    download.mockImplementation(async (_id, file) => {
      await writeFile(file, 'partial');
      return { ok: false, error: { code: 'network', message: 'Interrupted' } };
    });
    const next = {
      ...loadedRelease,
      videos: [{ title: 'Second', url: 'https://youtu.be/lmnopqrstuv' }],
    };
    expect(await library.download({ release: next, videoIndex: 0 })).toMatchObject({ ok: false });
    expect((await readdir(directory)).filter((file) => file.startsWith('.download'))).toEqual([]);
    expect(await library.list()).toMatchObject({
      ok: true,
      value: [expect.objectContaining({ id: '12-abcdefghijk' })],
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('preserves an existing audio file when publishing a new download collides', async () => {
  const { readFile } = await import('node:fs/promises');
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-audio-'));
  const filename = 'Low Tide - Quiet Orbit [12-abcdefghijk].yt.mp3';
  try {
    await writeFile(join(directory, filename), 'previously recovered audio');
    const library = createAudioLibrary(directory, {
      probe: () =>
        Promise.resolve({ ok: true, value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' } }),
      download: async (_id, file) => {
        await writeFile(file, 'new audio');
        return { ok: true, value: undefined };
      },
    });
    expect(await library.download({ release: loadedRelease, videoIndex: 0 })).toMatchObject({
      ok: false,
      error: { code: 'storage' },
    });
    expect(await readFile(join(directory, filename), 'utf8')).toBe('previously recovered audio');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('corrects a saved source offline without redownloading and can restore the video title', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-audio-'));
  const release = {
    ...loadedRelease,
    videos: [{ title: 'Unidentified upload', url: 'https://youtu.be/abcdefghijk' }],
  };
  const probe = vi
    .fn<ReturnType<typeof import('./downloader').createDownloader>['probe']>()
    .mockResolvedValue({
      ok: true,
      value: { videoId: 'abcdefghijk', title: 'Unidentified upload' },
    });
  const download = vi
    .fn<ReturnType<typeof import('./downloader').createDownloader>['download']>()
    .mockImplementation(async (_id, file) => {
      await writeFile(file, 'audio');
      return { ok: true, value: undefined };
    });
  try {
    const library = createAudioLibrary(directory, { probe, download });
    const original = await library.download({ release, videoIndex: 0, trackIndex: null });
    expect(original).toMatchObject({ ok: true, value: { title: 'Unidentified upload' } });
    probe.mockResolvedValue({ ok: false, error: { code: 'network', message: 'offline' } });
    const corrected = await library.download({ release, videoIndex: 0, trackIndex: 0 });
    expect(corrected).toMatchObject({ ok: true, value: { title: 'Quiet Orbit', trackIndex: 0 } });
    if (!corrected.ok) throw new Error('Expected corrected tags');
    expect(await NodeID3.Promise.read(join(directory, corrected.value.filename))).toMatchObject({
      title: 'Quiet Orbit',
      trackNumber: '1',
    });
    expect(await library.download({ release, videoIndex: 0, trackIndex: null })).toMatchObject({
      ok: true,
      value: { title: 'Unidentified upload', trackIndex: null },
    });
    expect(download).toHaveBeenCalledTimes(1);
    expect(probe).toHaveBeenCalledTimes(1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('versions track sidecars and preserves unsupported metadata', async () => {
  const { readFile } = await import('node:fs/promises');
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-audio-'));
  try {
    const library = createAudioLibrary(directory, {
      probe: () =>
        Promise.resolve({ ok: true, value: { videoId: 'abcdefghijk', title: 'Quiet Orbit' } }),
      download: async (_id, file) => {
        await writeFile(file, 'audio');
        return { ok: true, value: undefined };
      },
    });
    await library.download({ release: loadedRelease, videoIndex: 0 });
    const file = join(directory, '12-abcdefghijk.json');
    const saved: unknown = JSON.parse(await readFile(file, 'utf8'));
    expect(saved).toMatchObject({ version: 1, track: { id: '12-abcdefghijk' } });
    const future = JSON.stringify({ version: 99, track: saved });
    await writeFile(file, future);
    expect(await library.list()).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
    expect(await readFile(file, 'utf8')).toBe(future);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('preserves the saved MP3 if publishing a corrected sidecar fails after tagging', async () => {
  const { mkdir, readFile, rename } = await import('node:fs/promises');
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-audio-'));
  let blockPublication = false;
  const request: typeof fetch = async () => {
    if (blockPublication) {
      await rename(join(directory, '12-abcdefghijk.json'), join(directory, 'metadata-backup.json'));
      await mkdir(join(directory, '12-abcdefghijk.json'));
    }
    return new Response('unavailable', { status: 404 });
  };
  try {
    const library = createAudioLibrary(
      directory,
      {
        probe: () =>
          Promise.resolve({ ok: true, value: { videoId: 'abcdefghijk', title: 'Unknown upload' } }),
        download: async (_id, file) => {
          await writeFile(file, 'audio');
          return { ok: true, value: undefined };
        },
      },
      request,
    );
    const original = await library.download({
      release: loadedRelease,
      videoIndex: 0,
      trackIndex: null,
    });
    if (!original.ok) throw new Error('Expected saved audio');
    const file = join(directory, original.value.filename);
    const bytes = await readFile(file);
    blockPublication = true;
    expect(
      await library.download({
        release: { ...loadedRelease, artworkUrl: 'https://i.discogs.com/cover.jpg' },
        videoIndex: 0,
        trackIndex: 0,
      }),
    ).toMatchObject({ ok: false, error: { code: 'storage' } });
    expect(await readFile(file)).toEqual(bytes);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
