import { z } from 'zod';
import { searchPageSchema } from '../shared/search';
import {
  accountSchema,
  discogsChannels,
  discogsErrorSchema,
  releaseSchema,
} from '../shared/discogs';
import { discogsFailure } from '../shared/discogsFailure';
import type { DiscogsBridge, DiscogsResult } from '../shared/discogs';

type Invoke = (channel: string, input?: unknown) => Promise<unknown>;
const envelopeSchema = z.object({
  ok: z.boolean(),
  value: z.unknown().optional(),
  error: z.unknown().optional(),
});

export function createDiscogsBridge(invoke: Invoke): DiscogsBridge {
  async function call<T>(
    channel: string,
    schema: z.ZodType<T>,
    input?: unknown,
  ): Promise<DiscogsResult<T>> {
    try {
      const envelope = envelopeSchema.safeParse(await invoke(channel, input));
      if (envelope.success) {
        if (envelope.data.ok) {
          const value = schema.safeParse(envelope.data.value);
          if (value.success) return { ok: true, value: value.data };
        } else {
          const error = discogsErrorSchema.safeParse(envelope.data.error);
          if (error.success) return { ok: false, error: error.data };
        }
      }
      return discogsFailure(
        'invalid-response',
        'The desktop returned a response the app could not read.',
      );
    } catch {
      return discogsFailure(
        'unavailable',
        'Could not contact the desktop. Please restart Auto Digger.',
      );
    }
  }
  return {
    search: (input) => call(discogsChannels.search, searchPageSchema, input),
    account: () => call(discogsChannels.account, accountSchema.nullable()),
    connect: (token) => call(discogsChannels.connect, accountSchema, token),
    loadRelease: (id) => call(discogsChannels.loadRelease, releaseSchema, id),
    disconnect: () => call(discogsChannels.disconnect, z.undefined()),
    openSettings: () => call(discogsChannels.openSettings, z.undefined()),
  };
}
