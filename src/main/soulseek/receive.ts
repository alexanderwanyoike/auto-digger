import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { AudioResult } from '../../shared/audio';
import type { SoulseekMatch } from '../../shared/soulseek';
import { audioFailure } from '../../shared/audio-failure';
import type { DownloadOptions } from '../audio/download-options';
import { downloadStage } from '../../shared/download-jobs';
import type { createSlskdClient } from './client';
import { completedFile } from './completed-file';
import { cancelOwnedTransfer } from './cancel-transfer';

export async function receiveFile(
  client: ReturnType<typeof createSlskdClient>,
  directory: string,
  match: SoulseekMatch,
  options: DownloadOptions,
): Promise<AudioResult<{ file: string; match: SoulseekMatch }>> {
  if (options.signal?.aborted) return audioFailure('cancelled', 'This download was cancelled.');
  const batchId = randomUUID();
  const signal = AbortSignal.any([
    AbortSignal.timeout(30 * 60_000),
    ...(options.signal ? [options.signal] : []),
  ]);
  let transferId: string | undefined;
  const state: { completed: boolean } = { completed: false };
  let outcome: AudioResult<{ file: string; match: SoulseekMatch }>;
  try {
    const waitForFile = async (
      attempt: number,
    ): Promise<AudioResult<{ file: string; match: SoulseekMatch }>> => {
      const file = await completedFile(directory, batchId, match.size);
      if (file.ok) return { ok: true, value: { file: file.value, match } };
      if (attempt === 19) return file;
      await delay(500, undefined, { signal });
      return waitForFile(attempt + 1);
    };
    const poll = async (): Promise<AudioResult<{ file: string; match: SoulseekMatch }>> => {
      const batch = await client.batch(batchId, signal);
      if (!batch.ok) return batch;
      const transfer = batch.value.transfers.find((item) => item.id === transferId);
      if (!transfer)
        return audioFailure('invalid-data', 'slskd lost this transfer. Try another match.');
      if (transfer.state.includes('Succeeded')) {
        state.completed = true;
        return waitForFile(0);
      }
      if (transfer.state.includes('Completed'))
        return audioFailure(
          'unavailable',
          'The Soulseek transfer did not finish. Retry it or choose another peer.',
        );
      options.onProgress?.({
        ...downloadStage('downloading'),
        bytes: transfer.bytesTransferred,
        totalBytes: match.size,
        percent: Math.min(100, Math.max(0, (transfer.bytesTransferred / match.size) * 100)),
        speed: transfer.averageSpeed || null,
        eta: null,
      });
      await delay(750, undefined, { signal });
      return poll();
    };
    const queued = await client.enqueue(match, batchId);
    if (!queued.ok) outcome = queued;
    else {
      transferId = queued.value.batch.transfers[0]?.id;
      outcome =
        queued.value.failures.length || !transferId
          ? audioFailure(
              'unavailable',
              'This peer could not accept the download. Try another match.',
            )
          : await poll();
    }
  } catch {
    outcome = audioFailure(
      options.signal?.aborted ? 'cancelled' : 'network',
      options.signal?.aborted
        ? 'This download was cancelled.'
        : 'The Soulseek download timed out. Retry or choose another peer.',
    );
  }
  if (!state.completed) {
    const stopped = await cancelOwnedTransfer(client, batchId, match, transferId);
    if (!stopped.ok) return stopped;
  }
  return options.signal?.aborted
    ? audioFailure('cancelled', 'This download was cancelled.')
    : outcome;
}
