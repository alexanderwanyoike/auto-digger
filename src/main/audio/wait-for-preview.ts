import type { AudioResult, LocalTrack } from '../../shared/audio';
import { audioFailure } from '../../shared/audio-failure';

export async function waitForPreview(
  task: Promise<AudioResult<LocalTrack>>,
  signal?: AbortSignal,
): Promise<AudioResult<LocalTrack>> {
  if (signal?.aborted) return audioFailure('cancelled', 'This download was cancelled.');
  if (!signal) return task;
  let onAbort = () => {};
  const cancelled = new Promise<AudioResult<LocalTrack>>((resolve) => {
    onAbort = () => {
      resolve(audioFailure('cancelled', 'This download was cancelled.'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([task, cancelled]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}
