import { z } from 'zod';
import { updateStateSchema } from '../shared/updates';
import type { UpdatesBridge, UpdateResult, UpdateState } from '../shared/updates';

export function createUpdatesBridge(invoke: (channel: string) => Promise<unknown>): UpdatesBridge {
  const schema = z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), value: updateStateSchema }),
    z.object({ ok: z.literal(false), error: z.string() }),
  ]);
  const call = async (operation: string): Promise<UpdateResult<UpdateState>> => {
    try {
      const result = schema.safeParse(await invoke(`updates:${operation}`));
      if (result.success) return result.data;
    } catch {
      return { ok: false, error: 'Updates could not be reached. Please retry.' };
    }
    return { ok: false, error: 'Update information could not be read. Please retry.' };
  };
  return {
    status: () => call('status'),
    check: () => call('check'),
    download: () => call('download'),
    install: () => call('install'),
  };
}
