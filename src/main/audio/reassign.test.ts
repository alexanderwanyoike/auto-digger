import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import type { LocalTrack } from '../../shared/audio';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { reassignTrack } from './reassign';

vi.mock('node:fs/promises', async (original) => ({
  ...(await original<typeof import('node:fs/promises')>()),
  rename: () => Promise.reject(new Error('storage failed')),
}));

test('keeps a recoverable staged correction when both replacement and metadata rollback fail', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-retag-'));
  const saved: LocalTrack = {
    id: '12-abcdefghijk',
    videoId: 'abcdefghijk',
    releaseId: 12,
    title: 'Unknown',
    sourceTitle: 'Unknown',
    trackIndex: null,
    album: 'Quiet Orbit EP',
    artist: 'Low Tide',
    artworkUrl: null,
    filename: 'Unknown.yt.mp3',
    warning: null,
  };
  try {
    await writeFile(join(directory, saved.filename), 'original audio');
    const save = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: saved })
      .mockResolvedValue({ ok: false, error: { code: 'storage', message: 'failed' } });
    const result = await reassignTrack(directory, { save }, saved, loadedRelease, 0, fetch);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error.message).toContain('recovery');
    expect(await readFile(join(directory, saved.filename), 'utf8')).toBe('original audio');
    expect(
      (await readdir(directory)).filter((name) => name.endsWith('.recovery.mp3')),
    ).toHaveLength(1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
