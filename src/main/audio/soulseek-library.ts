import { copyFile, link, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { AudioResult, LocalTrack, SoulseekDownloadInput } from '../../shared/audio';
import type { SoulseekMatch } from '../../shared/soulseek';
import { audioFailure } from '../../shared/audio-failure';
import { downloadSourceId } from '../../shared/download-source-id';
import { downloadStage } from '../../shared/download-jobs';
import type { DownloadOptions } from './download-options';
import { createLibraryFiles } from './library-files';
import { filenamePart } from './filename-part';
import { tagDownload } from './tagging';

export type ReceiveSoulseek = (
  input: SoulseekDownloadInput,
  options: DownloadOptions,
) => Promise<AudioResult<{ file: string; match: SoulseekMatch }>>;
export async function importSoulseekAudio(
  directory: string,
  input: SoulseekDownloadInput,
  receive: ReceiveSoulseek,
  options: DownloadOptions,
): Promise<AudioResult<LocalTrack>> {
  const received = await receive(input, options);
  if (!received.ok) return received;
  const { file, match } = received.value;
  const track = input.release.tracks[input.trackIndex];
  const id = downloadSourceId(input);
  const extension = extname(match.filename).toLowerCase();
  if (
    !track ||
    !id ||
    match.id !== input.candidateId ||
    match.access !== 'public' ||
    !/^\.(mp3|flac|wav|m4a|ogg|opus)$/.test(extension)
  )
    return audioFailure('invalid-input', 'Choose an available audio match and a valid track.');
  let temporary: string | undefined;
  let committed: string | undefined;
  try {
    if ((await stat(file)).size !== match.size)
      return audioFailure(
        'storage',
        'The completed Soulseek file is incomplete or changed. Retry the download.',
      );
    await mkdir(directory, { recursive: true });
    temporary = await mkdtemp(join(directory, '.download-'));
    const staged = join(temporary, `audio${extension}`);
    await copyFile(file, staged);
    let warning: string | null =
      'Original audio tags were kept; Discogs metadata is saved in Auto Digger.';
    if (extension === '.mp3') {
      options.onProgress?.(downloadStage('tagging'));
      const tagged = await tagDownload(staged, input.release, track.title, {
        trackIndex: input.trackIndex,
      });
      if (!tagged.ok) return tagged;
      warning = tagged.value.warning;
    }
    if (options.signal?.aborted) return audioFailure('cancelled', 'This download was cancelled.');
    const saved: LocalTrack = {
      id,
      releaseId: input.release.id,
      videoId: null,
      provider: 'soulseek',
      soulseek: { username: match.username, filename: match.filename, size: match.size },
      title: track.title,
      sourceTitle: match.filename.split(/[\\/]/).at(-1) ?? match.filename,
      trackIndex: input.trackIndex,
      artist: input.release.artists.join(' / '),
      album: input.release.title,
      artworkUrl: input.release.artworkUrl,
      filename: `${filenamePart(input.release.artists.join(', '))} - ${filenamePart(track.title)} [${id}].slsk${extension}`,
      warning,
    };
    const destination = join(directory, saved.filename);
    await link(staged, destination);
    committed = destination;
    const result = await createLibraryFiles(directory).save(saved);
    if (result.ok) committed = undefined;
    return result;
  } catch {
    return audioFailure(
      'storage',
      'The Soulseek audio could not be added to Auto Digger. Check the downloads folders and available space.',
    );
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true }).catch(() => undefined);
    if (committed) await rm(committed, { force: true }).catch(() => undefined);
  }
}
