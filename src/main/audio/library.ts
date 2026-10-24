import { link, mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { downloadInputSchema } from '../../shared/audio';
import type { AudioResult, LocalTrack } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';
import { videoId } from '../../shared/youtubeVideoId';
import { matchTrack } from '../../shared/matchTrack';
import type { createDownloader } from './downloader';
import { createLibraryFiles } from './libraryFiles';
import { tagDownload } from './tagging';
import { reassignTrack } from './reassign';

export function filenamePart(value: string): string {
  let safe = Array.from(value)
    .filter((character) => (character.codePointAt(0) ?? 0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '')
    .trim()
    .replace(/\.+$/g, '');
  while (Buffer.byteLength(safe) > 70) safe = safe.slice(0, -1);
  return safe || 'Unknown';
}

export function createAudioLibrary(
  directory: string,
  downloader: ReturnType<typeof createDownloader>,
  request: typeof fetch = fetch,
) {
  const files = createLibraryFiles(directory);
  let busy = false;
  return {
    list: () => files.list(),
    find: (id: string) => files.read(id),
    async download(input: unknown): Promise<AudioResult<LocalTrack>> {
      const parsed = downloadInputSchema.safeParse(input);
      if (!parsed.success)
        return audioFailure('invalid-input', 'Choose a video and a valid Discogs track.');
      const { release, videoIndex, trackIndex } = parsed.data;
      const video = release.videos[videoIndex];
      if (!video || (typeof trackIndex === 'number' && !release.tracks[trackIndex]))
        return audioFailure('invalid-input', 'Choose a video and a valid Discogs track.');
      if (busy)
        return audioFailure(
          'busy',
          'A track is already downloading. Please wait for it to finish.',
        );
      busy = true;
      let temporary: string | undefined;
      let finalFile: string | undefined;
      try {
        const existing = await files.list();
        if (!existing.ok) return existing;
        const sourceId = videoId(video.url);
        if (!sourceId) return audioFailure('invalid-input', 'Choose a supported YouTube source.');
        const id = `${release.id.toString()}-${sourceId}`;
        const saved = existing.value.find((track) => track.id === id);
        if (saved && !saved.missing) {
          if (trackIndex === undefined || trackIndex === saved.trackIndex)
            return { ok: true, value: saved };
          return await reassignTrack(directory, files, saved, release, trackIndex, request);
        }
        const source = await downloader.probe(video.url);
        if (!source.ok) return source;
        temporary = await mkdtemp(join(directory, '.download-'));
        const staged = join(temporary, 'audio.mp3');
        const download = await downloader.download(source.value.videoId, staged);
        if (!download.ok) return download;
        if ((await stat(staged)).size === 0)
          return audioFailure(
            'unavailable',
            'YouTube returned an empty audio file. Please try another source.',
          );
        const tagged = await tagDownload(staged, release, source.value.title, {
          request,
          trackIndex,
        });
        if (!tagged.ok) return tagged;
        const track: LocalTrack = {
          id,
          releaseId: release.id,
          videoId: source.value.videoId,
          title: tagged.value.title,
          sourceTitle: source.value.title,
          trackIndex:
            trackIndex === undefined ? matchTrack(release, source.value.title) : trackIndex,
          artist: release.artists.join(' / '),
          album: release.title,
          artworkUrl: release.artworkUrl,
          filename: `${filenamePart(release.artists.join(', '))} - ${filenamePart(tagged.value.title)} [${id}].yt.mp3`,
          warning: tagged.value.warning,
        };
        const destination = join(directory, track.filename);
        await link(staged, destination);
        finalFile = destination;
        const result = await files.save(track);
        if (result.ok) finalFile = undefined;
        return result;
      } catch {
        return audioFailure(
          'storage',
          'The audio could not be saved. Check your Music folder and available space, then retry.',
        );
      } finally {
        if (temporary) await rm(temporary, { recursive: true, force: true }).catch(() => undefined);
        if (finalFile) await rm(finalFile, { force: true }).catch(() => undefined);
        busy = false;
      }
    },
  };
}
