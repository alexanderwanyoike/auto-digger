import { z } from 'zod';
import type { StoreLinksBridge } from '../shared/storeLinks';

export function createStoreLinksBridge(
  invoke: (channel: string, input: unknown) => Promise<unknown>,
): StoreLinksBridge {
  return {
    async open(platform, release) {
      try {
        const response = z
          .discriminatedUnion('ok', [
            z.object({ ok: z.literal(true), value: z.undefined() }),
            z.object({
              ok: z.literal(false),
              error: z.object({
                code: z.enum(['invalid-input', 'unavailable']),
                message: z.string(),
              }),
            }),
          ])
          .safeParse(await invoke('store:open', { platform, release }));
        if (response.success) return response.data;
      } catch {
        /* Opening a browser is an optional external boundary. */
      }
      return {
        ok: false,
        error: { code: 'unavailable', message: 'The store could not be opened. Please retry.' },
      };
    },
  };
}
