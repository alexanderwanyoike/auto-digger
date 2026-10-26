import { z } from 'zod';
import { crateChannels, crateErrorSchema } from '../shared/crate';
import type { CrateBridge, CrateResult } from '../shared/crate';
import { releaseSchema } from '../shared/discogs';
import { crateFailure } from '../shared/crate-failure';

type Invoke = (channel: string, input?: unknown) => Promise<unknown>;
const envelope = z.object({
  ok: z.boolean(),
  value: z.unknown().optional(),
  error: z.unknown().optional(),
});
export function createCrateBridge(invoke: Invoke): CrateBridge {
  async function call(channel: string, input?: unknown): Promise<CrateResult> {
    try {
      const result = envelope.safeParse(await invoke(channel, input));
      if (result.success) {
        if (result.data.ok) {
          const value = z.array(releaseSchema).safeParse(result.data.value);
          if (value.success) return { ok: true, value: value.data };
        } else {
          const error = crateErrorSchema.safeParse(result.data.error);
          if (error.success) return { ok: false, error: error.data };
        }
      }
      return crateFailure('invalid-data', 'The desktop returned an unreadable crate response.');
    } catch {
      return crateFailure(
        'unavailable',
        'Could not contact crate storage. Please restart Auto Digger.',
      );
    }
  }
  return {
    list: () => call(crateChannels.list),
    save: (release) => call(crateChannels.save, release),
    remove: (id) => call(crateChannels.remove, id),
  };
}
