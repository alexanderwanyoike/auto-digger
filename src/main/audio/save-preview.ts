import { copyFile, link, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { AudioResult, DownloadInput, LocalTrack } from '../../shared/audio';
import { audioFailure } from '../../shared/audio-failure';
import { downloadStage } from '../../shared/download-jobs';
import type { PreviewAudio } from './previews';
import type { DownloadOptions } from './download-options';
import { tagDownload } from './tagging';
import { filenamePart } from './filename-part';
import { createLibraryFiles } from './library-files';

export async function savePreview(
  directory: string,
  input: DownloadInput,
  preview: PreviewAudio,
  options: DownloadOptions,
  request: typeof fetch = fetch,
): Promise<AudioResult<LocalTrack>> {
  const { release } = input;
  const trackIndex = input.trackIndex === undefined ? preview.track.trackIndex : input.trackIndex;
  const extension = extname(preview.file);
  const sourceTitle =
    'provider' in input
      ? preview.track.sourceTitle.slice(0, -extension.length)
      : preview.track.sourceTitle;
  let title = release.tracks[trackIndex ?? -1]?.title ?? sourceTitle;
  let { warning } = preview.track;
  let temporary: string | undefined;
  let committed: string | undefined;
  try {
    if (options.signal?.aborted) return audioFailure('cancelled', 'This download was cancelled.');
    await mkdir(directory, { recursive: true });
    temporary = await mkdtemp(join(directory, '.preview-save-'));
    const staged = join(temporary, `audio${extension}`);
    await copyFile(preview.file, staged);
    if (extension === '.mp3') {
      options.onProgress?.(downloadStage('tagging'));
      const tagged = await tagDownload(staged, release, sourceTitle, { trackIndex, request });
      if (!tagged.ok) return tagged;
      ({ title, warning } = tagged.value);
    }
    if (options.signal?.aborted) return audioFailure('cancelled', 'This download was cancelled.');
    const suffix = 'provider' in input ? `.slsk${extension}` : '.yt.mp3';
    const track: LocalTrack = {
      ...preview.track,
      title,
      trackIndex,
      warning,
      artist: release.artists.join(' / '),
      album: release.title,
      artworkUrl: release.artworkUrl,
      filename: `${filenamePart(release.artists.join(', '))} - ${filenamePart(title)} [${preview.track.id}]${suffix}`,
    };
    const destination = join(directory, track.filename);
    await link(staged, destination);
    committed = destination;
    const result = await createLibraryFiles(directory).save(track);
    if (result.ok) committed = undefined;
    return result;
  } catch {
    return audioFailure(
      'storage',
      'The preview could not be saved. Check your downloads folder and retry.',
    );
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true }).catch(() => undefined);
    if (committed) await rm(committed, { force: true }).catch(() => undefined);
  }
}
