import { mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { downloadInputSchema, trackIdSchema } from '../../shared/audio';
import type { AudioResult, DownloadInput, LocalTrack } from '../../shared/audio';
import { audioFailure } from '../../shared/audio-failure';
import { downloadSourceId } from '../../shared/download-source-id';
import type { createDownloader } from './downloader';
import { createAudioLibrary } from './library';
import { importSoulseekAudio } from './soulseek-library';
import type { ReceiveSoulseek } from './soulseek-library';
import { waitForPreview } from './wait-for-preview';

export interface PreviewAudio {
  track: LocalTrack;
  file: string;
}

export function createAudioPreviews(
  directory: string,
  downloader: ReturnType<typeof createDownloader>,
  receive?: ReceiveSoulseek,
  request: typeof fetch = fetch,
) {
  const entries = new Map<string, PreviewAudio & { owned: boolean }>();
  const youtube = createAudioLibrary(directory, downloader, request);
  let stopped = false;
  let active:
    { id: string; controller: AbortController; task: Promise<AudioResult<LocalTrack>> } | undefined;
  async function remove(id: string) {
    const entry = entries.get(id);
    entries.delete(id);
    if (entry?.owned)
      await Promise.all(
        [entry.file, join(directory, `${id}.json`)].map((file) =>
          rm(file, { force: true }).catch(() => undefined),
        ),
      );
  }
  async function find(id: string, signal?: AbortSignal): Promise<AudioResult<PreviewAudio | null>> {
    if (active?.id === id) {
      const prepared = await waitForPreview(active.task, signal);
      if (!prepared.ok) return prepared;
    }
    const entry = entries.get(id);
    if (!entry) return { ok: true, value: null };
    try {
      if (!(await stat(entry.file)).isFile()) return { ok: true, value: null };
      entries.delete(id);
      entries.set(id, entry);
      return { ok: true, value: { track: entry.track, file: entry.file } };
    } catch {
      await remove(id);
      return { ok: true, value: null };
    }
  }
  async function prepareFile(
    input: DownloadInput,
    signal: AbortSignal,
  ): Promise<AudioResult<LocalTrack>> {
    try {
      await mkdir(directory, { recursive: true });
      let result: AudioResult<LocalTrack>;
      if ('provider' in input) {
        if (!receive)
          return audioFailure('unavailable', 'Connect slskd in Settings before previewing.');
        result = await importSoulseekAudio(directory, input, receive, { signal });
      } else result = await youtube.download(input, { signal });
      if (result.ok) {
        entries.set(result.value.id, {
          track: result.value,
          file: join(directory, result.value.filename),
          owned: true,
        });
        if (entries.size > 10) {
          const oldest = entries.keys().next().value;
          if (oldest) await remove(oldest);
        }
      }
      return result;
    } catch {
      return audioFailure(
        'storage',
        'The preview could not be prepared. Check temporary storage and retry.',
      );
    }
  }
  return {
    find,
    async locate(id: string): Promise<AudioResult<PreviewAudio>> {
      if (!trackIdSchema.safeParse(id).success)
        return audioFailure('invalid-input', 'Choose an available preview.');
      const result = await find(id);
      return result.ok && result.value
        ? { ok: true, value: result.value }
        : audioFailure('unavailable', 'This preview has expired. Preview the source again.');
    },
    async prepare(input: unknown): Promise<AudioResult<LocalTrack>> {
      const parsed = downloadInputSchema.safeParse(input);
      if (
        !parsed.success ||
        (typeof parsed.data.trackIndex === 'number' &&
          !parsed.data.release.tracks[parsed.data.trackIndex])
      )
        return audioFailure('invalid-input', 'Choose an available audio source and Discogs track.');
      if (stopped)
        return audioFailure('unavailable', 'Previews have stopped because Auto Digger is closing.');
      const id = downloadSourceId(parsed.data);
      if (!id) return audioFailure('invalid-input', 'Choose an available audio source.');
      const cached = await find(id);
      if (cached.ok && cached.value) return { ok: true, value: cached.value.track };
      if (active)
        return active.id === id
          ? active.task
          : audioFailure(
              'busy',
              'Another preview is preparing. Cancel it before previewing another source.',
            );
      const controller = new AbortController();
      const task = prepareFile(parsed.data, controller.signal);
      active = { id, controller, task };
      try {
        return await task;
      } finally {
        active = undefined;
      }
    },
    cancel(id: string): AudioResult<undefined> {
      if (!trackIdSchema.safeParse(id).success)
        return audioFailure('invalid-input', 'Choose an active preview.');
      if (active?.id === id) active.controller.abort();
      return { ok: true, value: undefined };
    },
    async adopt(track: LocalTrack, file: string) {
      const previous = entries.get(track.id);
      if (!previous) return;
      entries.set(track.id, { track, file, owned: false });
      if (previous.owned)
        await Promise.all(
          [previous.file, join(directory, `${track.id}.json`)].map((temporary) =>
            rm(temporary, { force: true }).catch(() => undefined),
          ),
        );
    },
    async close(): Promise<AudioResult<undefined>> {
      stopped = true;
      active?.controller.abort();
      await active?.task;
      entries.clear();
      try {
        await rm(directory, { recursive: true, force: true });
        return { ok: true, value: undefined };
      } catch {
        return audioFailure(
          'storage',
          'Temporary previews could not be cleared. Saved downloads are preserved.',
        );
      }
    },
  };
}
