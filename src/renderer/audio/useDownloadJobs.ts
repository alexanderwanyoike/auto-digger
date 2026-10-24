import { useEffect, useRef, useState } from 'react';
import type { AudioError, AudioResult, DownloadInput, LocalTrack } from '../../shared/audio';
import type { DownloadJob, DownloadJobsBridge } from '../../shared/downloadJobs';
import { audioFailure } from '../../shared/audioFailure';
import { jobOutcome } from './jobOutcome';

export function useDownloadJobs(bridge: DownloadJobsBridge | undefined) {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const latest = useRef<DownloadJob[]>([]);
  const waiters = useRef(new Map<string, (result: AudioResult<LocalTrack>) => void>());
  useEffect(() => {
    let active = true;
    const pending = waiters.current;
    function failPending(error: AudioError) {
      pending.forEach((resolve) => {
        resolve({ ok: false, error });
      });
      pending.clear();
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      if (!bridge) return;
      try {
        const result = await bridge.list();
        if (!active) return;
        if (result.ok) {
          latest.current = result.value;
          setJobs(result.value);
          setLoadError(null);
          result.value.forEach((job) => {
            const outcome = jobOutcome(job);
            const resolve = waiters.current.get(job.id);
            if (outcome && resolve) {
              waiters.current.delete(job.id);
              resolve(outcome);
            }
          });
        } else {
          setLoadError(result.error.message);
          failPending(result.error);
        }
      } catch {
        if (active) {
          const message = 'The download queue could not be reached. Please retry.';
          setLoadError(message);
          failPending({ code: 'unavailable', message });
        }
      }
      if (active)
        timer = setTimeout(() => {
          poll().catch(() => undefined);
        }, 400);
    }
    poll().catch(() => undefined);
    return () => {
      active = false;
      clearTimeout(timer);
      pending.forEach((resolve) => {
        resolve(
          audioFailure(
            'unavailable',
            'The window closed while this download was running. Check Downloads when you reopen it.',
          ),
        );
      });
      pending.clear();
    };
  }, [bridge]);
  async function call<T>(
    operation: (api: DownloadJobsBridge) => Promise<AudioResult<T>>,
  ): Promise<AudioResult<T>> {
    setActionError(null);
    let result: AudioResult<T>;
    try {
      result = bridge
        ? await operation(bridge)
        : audioFailure('unavailable', 'Use the desktop app to manage downloads.');
    } catch {
      result = audioFailure(
        'unavailable',
        'Your download queue could not be reached. Please retry.',
      );
    }
    if (!result.ok) setActionError(result.error.message);
    return result;
  }
  function wait(job: DownloadJob): Promise<AudioResult<LocalTrack>> {
    const outcome = jobOutcome(latest.current.find((item) => item.id === job.id) ?? job);
    if (outcome) return Promise.resolve(outcome);
    return new Promise((resolve) => {
      waiters.current.set(job.id, resolve);
    });
  }
  async function start(inputs: DownloadInput[]) {
    const result = await call((api) => api.start(inputs));
    if (result.ok)
      setJobs((previous) => [
        ...previous.filter((job) => !result.value.some((item) => item.id === job.id)),
        ...result.value,
      ]);
    return result;
  }
  return {
    jobs,
    error: actionError ?? loadError,
    available: Boolean(bridge),
    completionKey: jobs
      .filter((job) => job.stage === 'complete')
      .map((job) => job.id)
      .join(','),
    cancel: (id: string) => call((api) => api.cancel(id)),
    retry: (id: string) => call((api) => api.retry(id)),
    async download(input: DownloadInput): Promise<AudioResult<LocalTrack>> {
      const result = await start([input]);
      if (!result.ok) return result;
      const job = result.value[0];
      return job
        ? wait(job)
        : audioFailure('unavailable', 'This download could not be queued. Please retry.');
    },
    async batch(
      inputs: DownloadInput[],
    ): Promise<AudioResult<{ tracks: LocalTrack[]; failed: number; cancelled: number }>> {
      const result = await start(inputs);
      if (!result.ok) return result;
      const outcomes = await Promise.all(result.value.map(wait));
      return {
        ok: true,
        value: {
          tracks: outcomes.flatMap((outcome) => (outcome.ok ? [outcome.value] : [])),
          failed: outcomes.filter((outcome) => !outcome.ok && outcome.error.code !== 'cancelled')
            .length,
          cancelled: outcomes.filter((outcome) => !outcome.ok && outcome.error.code === 'cancelled')
            .length,
        },
      };
    },
  };
}
