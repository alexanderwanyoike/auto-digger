import { dirname, join } from 'node:path';
import type { createCatalogueStore } from '../catalogue/store';
import type { createDownloader } from './downloader';
import { createAudioLibrary, filenamePart } from './library';
import { downloadInputSchema } from '../../shared/audio';
import type { AudioResult, LocalTrack } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';
import { videoId } from '../../shared/youtubeVideoId';

export function createIndexedLibrary(
  defaultDirectory: string,
  catalogue: ReturnType<typeof createCatalogueStore>,
  downloader: ReturnType<typeof createDownloader>,
  request: typeof fetch = fetch,
) {
  const libraries = new Map<string, ReturnType<typeof createAudioLibrary>>();
  let busy = false;
  function library(directory: string) {
    let instance = libraries.get(directory);
    if (!instance) {
      instance = createAudioLibrary(directory, downloader, request);
      libraries.set(directory, instance);
    }
    return instance;
  }
  async function list(): Promise<AudioResult<LocalTrack[]>> {
    const remembered = await catalogue.downloads.rememberDirectory(defaultDirectory);
    if (!remembered.ok) return audioFailure('storage', remembered.error.message);
    const directories = await catalogue.downloads.directories();
    const records = await catalogue.downloads.list();
    if (!directories.ok) return audioFailure('storage', directories.error.message);
    if (!records.ok) return audioFailure('storage', records.error.message);
    const tracks = new Map(
      records.value.map((record) => [record.track.id, { ...record.track, missing: true }]),
    );
    const scanned = await Promise.all(
      directories.value.map(async (directory) => ({
        directory,
        result: await library(directory).list(),
      })),
    );
    const failed = scanned.find((scan) => !scan.result.ok);
    if (failed) return failed.result;
    const saved = await Promise.all(
      scanned.flatMap(({ directory, result }) =>
        result.ok
          ? result.value.map(async (track) => {
              const existing = records.value.find((record) => record.track.id === track.id);
              if (existing && existing.directory !== directory)
                return { ok: true as const, value: undefined };
              tracks.set(track.id, { ...track, missing: track.missing === true });
              return catalogue.downloads.save({ directory, track });
            })
          : [],
      ),
    );
    const failure = saved.find((result) => !result.ok);
    if (failure) return audioFailure('storage', failure.error.message);
    return {
      ok: true,
      value: [...tracks.values()].sort((left, right) => left.id.localeCompare(right.id)),
    };
  }
  async function location(id: string): Promise<AudioResult<{ track: LocalTrack; file: string }>> {
    const records = await catalogue.downloads.list();
    if (!records.ok) return audioFailure('storage', records.error.message);
    const record = records.value.find((item) => item.track.id === id);
    return record
      ? {
          ok: true,
          value: { track: record.track, file: join(record.directory, record.track.filename) },
        }
      : audioFailure('invalid-input', 'Choose a downloaded track.');
  }
  async function locate(id: string): Promise<AudioResult<{ track: LocalTrack; file: string }>> {
    const record = await location(id);
    if (!record.ok) return record;
    const valid = await library(dirname(record.value.file)).find(id);
    return valid.ok ? { ok: true, value: { track: valid.value, file: record.value.file } } : valid;
  }
  return {
    list,
    locate,
    location,
    async root(): Promise<AudioResult<string>> {
      const preferences = await catalogue.preferences.read();
      return preferences.ok
        ? { ok: true, value: preferences.value.directory ?? defaultDirectory }
        : audioFailure('storage', preferences.error.message);
    },
    async find(id: string): Promise<AudioResult<LocalTrack>> {
      const result = await locate(id);
      return result.ok ? { ok: true, value: result.value.track } : result;
    },
    async download(input: unknown): Promise<AudioResult<LocalTrack>> {
      const parsed = downloadInputSchema.safeParse(input);
      if (!parsed.success)
        return audioFailure('invalid-input', 'Choose a video and a valid Discogs track.');
      if (busy)
        return audioFailure(
          'busy',
          'A track is already downloading. Please wait for it to finish.',
        );
      busy = true;
      try {
        const { release, videoIndex } = parsed.data;
        const sourceId = videoId(release.videos[videoIndex]?.url ?? '');
        if (!sourceId) return audioFailure('invalid-input', 'Choose a supported YouTube source.');
        const current = await list();
        if (!current.ok) return current;
        const records = await catalogue.downloads.list();
        const preferences = await catalogue.preferences.read();
        if (!records.ok) return audioFailure('storage', records.error.message);
        if (!preferences.ok) return audioFailure('storage', preferences.error.message);
        const existing = records.value.find(
          (record) => record.track.id === `${release.id.toString()}-${sourceId}`,
        );
        const root = preferences.value.directory ?? defaultDirectory;
        const target =
          preferences.value.layout === 'release'
            ? join(
                root,
                `${filenamePart(release.artists.join(', '))} - ${filenamePart(release.title)} [r${release.id.toString()}]`,
              )
            : root;
        const directory = existing?.directory ?? target;
        const remembered = await catalogue.downloads.rememberDirectory(directory);
        if (!remembered.ok) return audioFailure('storage', remembered.error.message);
        const result = await library(directory).download(parsed.data);
        if (!result.ok) return result;
        const indexed = await catalogue.downloads.save({ directory, track: result.value });
        return indexed.ok
          ? result
          : audioFailure(
              'storage',
              'The audio was saved with its recovery metadata, but the catalogue could not update. Please retry.',
            );
      } finally {
        busy = false;
      }
    },
  };
}
