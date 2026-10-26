import { z } from 'zod';
import { savedFiltersSchema } from '../shared/saved-filters';
import type { SavedFiltersBridge, SavedFiltersResult } from '../shared/saved-filters';
import { crateErrorSchema } from '../shared/crate';
import { catalogueFailure } from '../shared/catalogue-failure';

export function createSavedFiltersBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): SavedFiltersBridge {
  async function call(channel: string, input?: unknown): Promise<SavedFiltersResult> {
    try {
      const response = z
        .discriminatedUnion('ok', [
          z.object({ ok: z.literal(true), value: savedFiltersSchema }),
          z.object({ ok: z.literal(false), error: crateErrorSchema }),
        ])
        .safeParse(await invoke(channel, input));
      if (response.success) return response.data;
    } catch {
      // IPC failures must not discard the current filter draft.
    }
    return catalogueFailure(
      'unavailable',
      'Your saved filters could not be reached. Please retry.',
    );
  }
  return {
    read: () => call('filters:read'),
    saveDraft: (input) => call('filters:draft', input),
    savePreset: (input) => call('filters:save', input),
    removePreset: (id) => call('filters:remove', id),
  };
}
