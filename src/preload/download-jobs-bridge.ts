import { z } from 'zod';
import { downloadJobSchema } from '../shared/download-jobs';
import type { DownloadJobsBridge } from '../shared/download-jobs';
import { audioErrorSchema } from '../shared/audio';
import type { AudioResult } from '../shared/audio';
import { audioFailure } from '../shared/audio-failure';

export function createDownloadJobsBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): DownloadJobsBridge {
  async function call<T>(
    channel: string,
    schema: z.ZodType<T>,
    input?: unknown,
  ): Promise<AudioResult<T>> {
    try {
      const response = z
        .discriminatedUnion('ok', [
          z.object({ ok: z.literal(true), value: schema }),
          z.object({ ok: z.literal(false), error: audioErrorSchema }),
        ])
        .safeParse(await invoke(channel, input));
      if (response.success) return response.data;
    } catch {
      /* No process details cross the queue boundary. */
    }
    return audioFailure('unavailable', 'Your download queue could not be reached. Please retry.');
  }
  return {
    list: () => call('jobs:list', z.array(downloadJobSchema)),
    start: (input) => call('jobs:start', z.array(downloadJobSchema), input),
    cancel: (id) => call('jobs:cancel', downloadJobSchema, id),
    retry: (id) => call('jobs:retry', downloadJobSchema, id),
  };
}
