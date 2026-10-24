import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import NodeID3 from 'node-id3';
import { tagDownload } from './tagging';
import { loadedRelease } from '../../../tests/discogsFixtures';

test('tags the matched Discogs track and front cover, retaining audio when artwork fails', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-tags-'));
  try {
    const file = join(directory, 'track.mp3');
    await writeFile(file, Buffer.from('audio-payload'));
    const release = { ...loadedRelease, artworkUrl: 'https://i.discogs.com/cover.jpg' };
    const fetchImage: typeof fetch = () =>
      Promise.resolve(
        new Response(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), {
          headers: { 'content-type': 'image/jpeg' },
        }),
      );
    expect(await tagDownload(file, release, 'Low Tide - Quiet Orbit', fetchImage)).toEqual({
      ok: true,
      value: { title: 'Quiet Orbit', warning: null },
    });
    const tags = await NodeID3.Promise.read(file);
    expect(tags).toMatchObject({
      title: 'Quiet Orbit',
      album: 'Quiet Orbit EP',
      artist: 'Low Tide',
      year: '1998',
      trackNumber: '1',
      genre: 'Electronic / Deep House',
      image: { mime: 'image/jpeg', type: { id: 3 } },
    });
    expect((await readFile(file)).includes(Buffer.from('audio-payload'))).toBe(true);
    const failedFetch: typeof fetch = () => Promise.reject(new Error('offline'));
    expect(await tagDownload(file, release, 'A whole EP mix', failedFetch)).toMatchObject({
      ok: true,
      value: { title: 'A whole EP mix', warning: expect.stringContaining('artwork') },
    });
    expect((await NodeID3.Promise.read(file)).trackNumber).toBeUndefined();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
