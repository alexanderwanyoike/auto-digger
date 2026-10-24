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
    probe: vi.fn(async (url: string) => ({
      ok: true as const,
      value: {
        videoId: url.includes('lmnopqrstuv') ? 'lmnopqrstuv' : 'abcdefghijk',
        title: url.includes('lmnopqrstuv') ? 'Unknown upload' : 'Low Tide - Quiet Orbit',
      },
    })),
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
        filename: expect.stringMatching(/\.yt\.mp3$/),
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
