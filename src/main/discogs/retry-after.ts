import type { DiscogsResult } from '../../shared/discogs';

export function retryAfter(response: Response, now: number) {
  const header = response.headers.get('Retry-After')?.trim() ?? '';
  const time = /^\d+$/.test(header) ? now + Number(header) * 1000 : Date.parse(header);
  return Number.isSafeInteger(time) ? Math.max(now + 1000, time) : now + 60_000;
}

export function rateLimited(retryAt: number): DiscogsResult<never> {
  return {
    ok: false,
    error: {
      code: 'rate-limited',
      message: 'Discogs is pausing new requests. Try again shortly.',
      retryAt,
    },
  };
}
