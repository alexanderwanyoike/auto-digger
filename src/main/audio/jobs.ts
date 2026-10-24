import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { downloadInputSchema } from '../../shared/audio';
import type { AudioResult, DownloadInput, LocalTrack } from '../../shared/audio';
import type { DownloadJob } from '../../shared/downloadJobs';
import { downloadStage } from '../../shared/downloadJobs';
import { audioFailure } from '../../shared/audioFailure';
import { videoId } from '../../shared/youtubeVideoId';
import type { DownloadOptions } from './downloadOptions';

const terminal = new Set(['complete', 'failed', 'cancelled']);
interface Entry {
  input: DownloadInput;
  job: DownloadJob;
  controller?: AbortController;
}
export function createDownloadJobs(
  execute: (input: DownloadInput, options: DownloadOptions) => Promise<AudioResult<LocalTrack>>,
) {
  const entries: Entry[] = [];
  let running: Promise<void> | undefined;
  let stopped = false;
  const snapshot = (entry: Entry) => structuredClone(entry.job);
  async function runNext(): Promise<void> {
    const entry = entries.find((item) => item.job.stage === 'queued');
    if (!entry || stopped) return;
    entry.controller = new AbortController();
    entry.job = { ...entry.job, ...downloadStage('preparing') };
    try {
      const result = await execute(entry.input, {
        signal: entry.controller.signal,
        onProgress: (progress) => {
          if (entry.job.stage !== 'cancelling') entry.job = { ...entry.job, ...progress };
        },
      });
      entry.job = result.ok
        ? { ...entry.job, ...downloadStage('complete'), track: result.value }
        : {
            ...entry.job,
            ...downloadStage(result.error.code === 'cancelled' ? 'cancelled' : 'failed'),
            error: result.error,
          };
    } catch {
      entry.job = {
        ...entry.job,
        ...downloadStage('failed'),
        error: { code: 'unavailable', message: 'This download could not finish. Please retry.' },
      };
    }
    delete entry.controller;
    await runNext();
  }
  function pump() {
    if (!running && !stopped)
      running = runNext().finally(() => {
        running = undefined;
      });
  }
  const pending = () => entries.filter((entry) => !terminal.has(entry.job.stage)).length;
  return {
    list(): AudioResult<DownloadJob[]> {
      return { ok: true, value: entries.map(snapshot) };
    },
    start(input: unknown): AudioResult<DownloadJob[]> {
      if (stopped)
        return audioFailure(
          'unavailable',
          'Downloads have stopped because Auto Digger is closing.',
        );
      const parsed = z.array(downloadInputSchema).min(1).max(100).safeParse(input);
      if (!parsed.success)
        return audioFailure('invalid-input', 'Choose between 1 and 100 audio sources.');
      if (pending() + parsed.data.length > 100)
        return audioFailure('busy', 'The download queue is full. Let some tracks finish first.');
      const keys = new Set(
        entries
          .filter((entry) => !terminal.has(entry.job.stage))
          .map(
            (entry) =>
              `${entry.input.release.id.toString()}-${videoId(entry.input.release.videos[entry.input.videoIndex]?.url ?? '') ?? ''}`,
          ),
      );
      const valid = parsed.data.every(({ release, videoIndex, trackIndex }) => {
        const source = videoId(release.videos[videoIndex]?.url ?? '');
        const key = `${release.id.toString()}-${source ?? ''}`;
        if (
          !source ||
          keys.has(key) ||
          (typeof trackIndex === 'number' && !release.tracks[trackIndex])
        )
          return false;
        keys.add(key);
        return true;
      });
      if (!valid)
        return audioFailure(
          'invalid-input',
          'Choose valid tracks and one pending job per YouTube source.',
        );
      while (entries.length + parsed.data.length > 200) {
        const index = entries.findIndex((entry) => terminal.has(entry.job.stage));
        if (index < 0) break;
        entries.splice(index, 1);
      }
      const created = parsed.data.map((request): Entry => ({
        input: request,
        job: {
          ...downloadStage('queued'),
          id: randomUUID(),
          title:
            request.release.tracks[request.trackIndex ?? -1]?.title ??
            request.release.videos[request.videoIndex]?.title ??
            request.release.title,
          releaseId: request.release.id,
          videoIndex: request.videoIndex,
          track: null,
          error: null,
        },
      }));
      entries.push(...created);
      pump();
      return { ok: true, value: created.map(snapshot) };
    },
    cancel(id: unknown): AudioResult<DownloadJob> {
      const entry = entries.find((item) => item.job.id === id);
      if (!entry) return audioFailure('invalid-input', 'Choose an existing download job.');
      if (!terminal.has(entry.job.stage)) {
        entry.job = {
          ...entry.job,
          ...downloadStage(entry.controller ? 'cancelling' : 'cancelled'),
        };
        entry.controller?.abort();
      }
      return { ok: true, value: snapshot(entry) };
    },
    retry(id: unknown): AudioResult<DownloadJob> {
      if (stopped)
        return audioFailure(
          'unavailable',
          'Downloads have stopped because Auto Digger is closing.',
        );
      const entry = entries.find((item) => item.job.id === id);
      if (!entry || !['failed', 'cancelled'].includes(entry.job.stage))
        return audioFailure('invalid-input', 'Choose a failed or cancelled download to retry.');
      if (pending() >= 100)
        return audioFailure('busy', 'The download queue is full. Let some tracks finish first.');
      entry.job = { ...entry.job, ...downloadStage('queued'), track: null, error: null };
      pump();
      return { ok: true, value: snapshot(entry) };
    },
    async close() {
      stopped = true;
      entries.forEach((entry) => {
        if (entry.job.stage === 'queued')
          entry.job = { ...entry.job, ...downloadStage('cancelled') };
        entry.controller?.abort();
      });
      await running;
    },
  };
}
