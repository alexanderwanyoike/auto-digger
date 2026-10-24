import { copyFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AudioResult, LocalTrack } from '../../shared/audio';
import type { DiscogsRelease } from '../../shared/discogs';
import { audioFailure } from '../../shared/audioFailure';
import type { createLibraryFiles } from './libraryFiles';
import { tagDownload } from './tagging';

export async function reassignTrack(
  directory: string,
  files: ReturnType<typeof createLibraryFiles>,
  saved: LocalTrack,
  release: DiscogsRelease,
  trackIndex: number | null,
  request: typeof fetch,
): Promise<AudioResult<LocalTrack>> {
  const original = join(directory, saved.filename);
  const staged = join(directory, `.${randomUUID()}.retag`);
  try {
    await copyFile(original, staged);
    const tagged = await tagDownload(staged, release, saved.sourceTitle, { request, trackIndex });
    if (!tagged.ok) return tagged;
    const corrected = {
      ...saved,
      title: tagged.value.title,
      warning: tagged.value.warning,
      trackIndex,
    };
    const published = await files.save(corrected);
    if (!published.ok) return published;
    try {
      await rename(staged, original);
    } catch {
      await files.save(saved);
      return audioFailure(
        'storage',
        'The track correction could not be saved. Your original audio has been preserved.',
      );
    }
    return { ok: true, value: corrected };
  } catch {
    return audioFailure(
      'storage',
      'The track correction could not be saved. Your original audio has been preserved.',
    );
  } finally {
    await rm(staged, { force: true }).catch(() => undefined);
  }
}
