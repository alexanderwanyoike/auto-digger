import type { AudioResult } from '../../shared/audio';
import type { SoulseekMatch } from '../../shared/soulseek';
import { audioFailure } from '../../shared/audio-failure';
import type { createSlskdClient } from './client';

export async function cancelOwnedTransfer(
  client: ReturnType<typeof createSlskdClient>,
  batchId: string,
  match: SoulseekMatch,
  knownId?: string,
): Promise<AudioResult<undefined>> {
  const uncertain = () =>
    audioFailure<undefined>(
      'network',
      'Auto Digger could not confirm that this transfer stopped. Check slskd before retrying.',
    );
  let id = knownId;
  if (!id) {
    const batch = await client.batch(batchId);
    if (!batch.ok) return uncertain();
    const transfer = batch.value.transfers.find((item) => item.filename === match.filename);
    if (!transfer) return uncertain();
    if (transfer.state.includes('Succeeded')) return { ok: true, value: undefined };
    id = transfer.id;
  }
  const cancelled = await client.cancel(match.username, id);
  return cancelled.ok ? { ok: true, value: undefined } : uncertain();
}
