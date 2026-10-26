import { lstat, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audio-failure';

export async function completedFile(
  root: string,
  batchId: string,
  size: number,
): Promise<AudioResult<string>> {
  try {
    const base = await realpath(root);
    const directory = join(base, 'auto-digger', batchId);
    const actual = await realpath(directory);
    const nested = relative(base, actual);
    if (nested.startsWith('..') || isAbsolute(nested))
      return audioFailure(
        'storage',
        'The slskd transfer folder is outside the configured downloads folder.',
      );
    const files = await readdir(directory, { withFileTypes: true });
    if (files.length !== 1 || !files[0]?.isFile())
      return audioFailure(
        'storage',
        'The completed Soulseek file is not ready or is not a regular file.',
      );
    const file = join(actual, files[0].name);
    const metadata = await lstat(file);
    return metadata.isFile() && metadata.size === size
      ? { ok: true, value: file }
      : audioFailure('storage', 'The completed Soulseek file has an unexpected size.');
  } catch {
    return audioFailure(
      'storage',
      'The completed Soulseek file is not visible here. Check the slskd completed-downloads folder in Settings.',
    );
  }
}
