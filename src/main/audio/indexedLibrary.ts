import { join } from 'node:path';
import type { createCatalogueStore } from '../catalogue/store';
import type { createDownloader } from './downloader';
import { createAudioLibrary } from './library';
import { createLibraryFiles } from './libraryFiles';
import { fileAvailable } from './fileAvailable';
import type { DownloadOptions } from './downloadOptions';
import { downloadDirectory } from './download-directory';
import { downloadInputSchema } from '../../shared/audio';
import type { AudioResult, LocalTrack } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';
import { downloadSourceId } from '../../shared/download-source-id';
import { importSoulseekAudio } from './soulseek-library';
import type { ReceiveSoulseek } from './soulseek-library';

export function createIndexedLibrary(
  defaultDirectory: string,
  catalogue: ReturnType<typeof createCatalogueStore>,
  downloader: ReturnType<typeof createDownloader>,
  request: typeof fetch = fetch,
  receiveSoulseek?: ReceiveSoulseek,
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
      await Promise.all(
        records.value.map(
          async (record) =>
            [
              record.track.id,
              {
                ...record.track,
                missing: !(await fileAvailable(join(record.directory, record.track.filename))),
              },
            ] as const,
        ),
      ),
    );
    const scanned = await Promise.all(
      directories.value.map(async (directory) => ({
        directory,
        result: await library(directory).list(),
      })),
    );
    const errors = scanned.flatMap((scan) => (scan.result.ok ? [] : [scan.result]));
    const invalid = errors.find((result) => result.error.code !== 'storage');
    if (invalid) return invalid;
    const firstError = errors[0];
    if (!records.value.length && scanned.every((scan) => !scan.result.ok) && firstError)
      return firstError;
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
    return (await fileAvailable(record.value.file))
      ? record
      : audioFailure(
          'storage',
          'This audio file is missing or unavailable. Restore it at its recorded location, or download the source again.',
        );
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
    async download(
      input: unknown,
      options: DownloadOptions = {},
    ): Promise<AudioResult<LocalTrack>> {
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
        const { release } = parsed.data;
        if (typeof parsed.data.trackIndex === 'number' && !release.tracks[parsed.data.trackIndex])
          return audioFailure('invalid-input', 'Choose a valid Discogs track.');
        const sourceId = downloadSourceId(parsed.data);
        if (!sourceId) return audioFailure('invalid-input', 'Choose a supported audio source.');
        const current = await list();
        if (!current.ok) return current;
        const records = await catalogue.downloads.list();
        const preferences = await catalogue.preferences.read();
        if (!records.ok) return audioFailure('storage', records.error.message);
        if (!preferences.ok) return audioFailure('storage', preferences.error.message);
        const existing = records.value.find((record) => record.track.id === sourceId);
        const available = current.value.some(
          (track) => track.id === existing?.track.id && !track.missing,
        );
        if (existing && available) {
          if (
            'provider' in parsed.data ||
            parsed.data.trackIndex === undefined ||
            parsed.data.trackIndex === existing.track.trackIndex
          )
            return { ok: true, value: existing.track };
          const recovered = await createLibraryFiles(existing.directory).save(existing.track);
          if (!recovered.ok) return recovered;
        }
        const root = preferences.value.directory ?? defaultDirectory;
        const target = downloadDirectory(
          root,
          preferences.value,
          release,
          'provider' in parsed.data ? 'Soulseek' : 'YouTube',
        );
        if (!target.ok) return audioFailure('invalid-input', target.error.message);
        const directory = existing?.directory ?? target.value;
        const remembered = await catalogue.downloads.rememberDirectory(directory);
        if (!remembered.ok) return audioFailure('storage', remembered.error.message);
        const result =
          'provider' in parsed.data
            ? receiveSoulseek
              ? await importSoulseekAudio(directory, parsed.data, receiveSoulseek, options)
              : audioFailure<LocalTrack>(
                  'unavailable',
                  'Connect slskd in Settings before using Soulseek.',
                )
            : await library(directory).download(parsed.data, options);
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
