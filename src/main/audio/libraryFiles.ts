import { lstat, mkdir, open, readFile, readdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { localTrackSchema, trackIdSchema } from '../../shared/audio';
import type { AudioResult, LocalTrack } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';

export function createLibraryFiles(directory: string) {
  async function read(id: string): Promise<AudioResult<LocalTrack>> {
    if (!trackIdSchema.safeParse(id).success)
      return audioFailure('invalid-input', 'This saved track could not be found.');
    try {
      const metadata = join(directory, `${id}.json`);
      if (!(await lstat(metadata)).isFile())
        return audioFailure('storage', 'This saved track could not be read.');
      const data: unknown = JSON.parse(await readFile(metadata, 'utf8'));
      const track = localTrackSchema.safeParse(data);
      if (
        !track.success ||
        track.data.id !== id ||
        !(await lstat(join(directory, track.data.filename))).isFile()
      )
        return audioFailure(
          'storage',
          'This saved track is missing or unreadable. Its files have been preserved.',
        );
      return { ok: true, value: track.data };
    } catch {
      return audioFailure(
        'storage',
        'This saved track is missing or unreadable. Its files have been preserved.',
      );
    }
  }
  return {
    read,
    async list(): Promise<AudioResult<LocalTrack[]>> {
      try {
        await mkdir(directory, { recursive: true });
        const names = (await readdir(directory))
          .filter(
            (name) => trackIdSchema.safeParse(name.slice(0, -5)).success && name.endsWith('.json'),
          )
          .sort();
        const results = await Promise.all(names.map((name) => read(name.slice(0, -5))));
        const failed = results.find((result) => !result.ok);
        if (failed) return failed;
        return { ok: true, value: results.flatMap((result) => (result.ok ? [result.value] : [])) };
      } catch {
        return audioFailure(
          'storage',
          'Your downloads folder could not be read. Check device storage and retry.',
        );
      }
    },
    async save(track: LocalTrack): Promise<AudioResult<LocalTrack>> {
      const temporary = join(directory, `.${randomUUID()}.tmp`);
      try {
        const file = await open(temporary, 'wx', 0o600);
        try {
          await file.writeFile(JSON.stringify(track));
          await file.sync();
        } finally {
          await file.close();
        }
        await rename(temporary, join(directory, `${track.id}.json`));
        return { ok: true, value: track };
      } catch {
        return audioFailure(
          'storage',
          'The audio could not be added to your library. Check device storage and retry.',
        );
      } finally {
        await rm(temporary, { force: true }).catch(() => undefined);
      }
    },
  };
}
