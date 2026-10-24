import { z } from 'zod';
import { preferencesSchema } from '../shared/preferences';
import type { PreferencesBridge, PreferencesResult } from '../shared/preferences';
import { crateErrorSchema } from '../shared/crate';
import { catalogueFailure } from '../shared/catalogueFailure';

export function createPreferencesBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): PreferencesBridge {
  async function call(channel: string, input?: unknown): Promise<PreferencesResult> {
    try {
      const response = z
        .discriminatedUnion('ok', [
          z.object({ ok: z.literal(true), value: preferencesSchema }),
          z.object({ ok: z.literal(false), error: crateErrorSchema }),
        ])
        .safeParse(await invoke(channel, input));
      if (response.success) return response.data;
    } catch {
      /* Settings remain private to validated desktop operations. */
    }
    return catalogueFailure('unavailable', 'Your settings could not be reached. Please retry.');
  }
  return {
    read: () => call('preferences:read'),
    save: (input) => call('preferences:save', input),
    chooseDirectory: () => call('preferences:directory'),
  };
}
