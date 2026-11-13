import type { DiscogsResult } from '../../shared/discogs';
import { rateLimited } from './retry-after';

const windowMs = 60_000;
const interactiveReserve = 8;

export function createDiscogsRequestBudget() {
  const sent: number[] = [];
  let remaining: number | undefined;
  let lastResponse = 0;
  let blockedUntil = 0;

  return {
    acquire(authenticated: boolean, background: boolean): DiscogsResult<undefined> {
      const now = Date.now();
      if (blockedUntil > now) return rateLimited(blockedUntil);
      while (sent[0] !== undefined && sent[0] + windowMs <= now) sent.shift();
      if (lastResponse + windowMs <= now) remaining = undefined;
      const reserve = background ? interactiveReserve : 0;
      const capacity = (authenticated ? 60 : 25) - reserve;
      if (remaining !== undefined && remaining <= reserve)
        return rateLimited(lastResponse + windowMs);
      if (sent.length >= capacity) return rateLimited((sent[0] ?? now) + windowMs);
      sent.push(now);
      if (remaining !== undefined) remaining -= 1;
      return { ok: true, value: undefined };
    },
    observe(response: Response, retryAt: number | undefined) {
      const header = response.headers.get('X-Discogs-Ratelimit-Remaining');
      if (header !== null && /^\d+$/.test(header)) {
        remaining = Number(header);
        lastResponse = Date.now();
      }
      if (retryAt !== undefined) {
        blockedUntil = Math.max(blockedUntil, retryAt);
        remaining = undefined;
      }
    },
  };
}

export type DiscogsRequestBudget = ReturnType<typeof createDiscogsRequestBudget>;
