import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createCatalogueStore } from '../catalogue/store';
import type { LocalTrack } from '../../shared/audio';

const track: LocalTrack = {
  id: '12-abcdefghijk',
  releaseId: 12,
  videoId: 'abcdefghijk',
  title: 'Quiet Orbit',
  sourceTitle: 'Quiet Orbit',
  trackIndex: 0,
  artist: 'Low Tide',
  album: 'Quiet Orbit EP',
  artworkUrl: null,
  filename: 'Quiet Orbit.yt.mp3',
  warning: null,
};
test('indexes download locations in SQLite and preserves them across settings changes and restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-index-'));
  const file = join(directory, 'catalog.sqlite');
  const store = createCatalogueStore(file);
  try {
    expect(await store.downloads.rememberDirectory(directory)).toMatchObject({ ok: true });
    expect(await store.downloads.save({ directory, track })).toMatchObject({ ok: true });
    await store.close();
    const reopened = createCatalogueStore(file);
    try {
      expect(await reopened.downloads.list()).toEqual({ ok: true, value: [{ directory, track }] });
      expect(await reopened.downloads.directories()).toEqual({ ok: true, value: [directory] });
      expect(await reopened.downloads.save({ directory: '../escape', track })).toMatchObject({
        ok: false,
        error: { code: 'invalid-input' },
      });
    } finally {
      await reopened.close();
    }
  } finally {
    await store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
