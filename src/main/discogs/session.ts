import { accountSchema } from '../../shared/discogs';
import type { DiscogsAccount, DiscogsResult } from '../../shared/discogs';
import { requestDiscogs } from './request';

export function createDiscogsSession(request: typeof fetch = (input, init) => fetch(input, init)) {
  let account: DiscogsAccount | null = null;

  return {
    account(): DiscogsResult<DiscogsAccount | null> {
      return { ok: true, value: account };
    },
    async connect(token: string): Promise<DiscogsResult<DiscogsAccount>> {
      const result = await requestDiscogs('/oauth/identity', token.trim(), accountSchema, request);
      if (result.ok) {
        account = result.value;
      }
      return result;
    },
  };
}
