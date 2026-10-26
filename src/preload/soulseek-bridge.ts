import { z } from 'zod';
import { audioErrorSchema } from '../shared/audio';
import type { AudioResult } from '../shared/audio';
import { audioFailure } from '../shared/audio-failure';
import {
  soulseekResultsSchema,
  soulseekSearchSchema,
  soulseekStatusSchema,
} from '../shared/soulseek';
import type { SoulseekBridge } from '../shared/soulseek';

export function createSoulseekBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): SoulseekBridge {
  async function call<T>(
    channel: string,
    schema: z.ZodType<T>,
    input?: unknown,
  ): Promise<AudioResult<T>> {
    try {
      const result = z
        .discriminatedUnion('ok', [
          z.object({ ok: z.literal(true), value: schema }),
          z.object({ ok: z.literal(false), error: audioErrorSchema }),
        ])
        .safeParse(await invoke(`soulseek:${channel}`, input));
      if (result.success) return result.data;
    } catch {
      /* No credential or filesystem detail crosses this boundary. */
    }
    return audioFailure(
      'unavailable',
      'Soulseek could not be reached. Restart Auto Digger and retry.',
    );
  }
  return {
    settings: () => call('settings', soulseekStatusSchema.nullable()),
    configure: (input) => call('configure', soulseekStatusSchema, input),
    disconnect: () => call('disconnect', z.undefined()),
    search: (input) => call('search', soulseekSearchSchema, input),
    results: (input) => call('results', soulseekResultsSchema, input),
    stop: (input) => call('stop', z.undefined(), input),
  };
}
