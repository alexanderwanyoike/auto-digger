import type { DiscogsError, DiscogsResult } from './discogs';

export function discogsFailure(code: DiscogsError['code'], message: string): DiscogsResult<never> {
  return { ok: false, error: { code, message } };
}
