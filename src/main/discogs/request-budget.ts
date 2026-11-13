import type { DiscogsResult } from '../../shared/discogs';
import { rateLimited } from './retry-after';

const windowMs = 60_000;
const interactiveReserve = 8;

function quota(limit: number) {
  return {
    limit,
    sent: [] as number[],
    remaining: undefined as number | undefined,
    observedAt: 0,
    inFlight: 0,
  };
}

export function createDiscogsRequestBudget() {
  const authenticatedQuota = quota(60);
  const anonymousQuota = quota(25);
  let blockedUntil = 0;
  let generation = 0;

  return {
    acquire(authenticated: boolean, background: boolean): DiscogsResult<number> {
      const now = Date.now();
      if (blockedUntil > now) return rateLimited(blockedUntil);
      const current = authenticated ? authenticatedQuota : anonymousQuota;
      while (current.sent[0] !== undefined && current.sent[0] + windowMs <= now)
        current.sent.shift();
      if (current.observedAt + windowMs <= now) current.remaining = undefined;
      const reserve = background ? interactiveReserve : 0;
      if (current.remaining !== undefined && current.remaining <= reserve)
        return rateLimited(current.observedAt + windowMs);
      if (current.sent.length >= current.limit - reserve)
        return rateLimited((current.sent[0] ?? now) + windowMs);
      current.sent.push(now);
      current.inFlight += 1;
      if (current.remaining !== undefined) current.remaining -= 1;
      return { ok: true, value: generation };
    },
    observe(
      authenticated: boolean,
      started: number,
      response: Response | undefined,
      retryAt: number | undefined,
    ) {
      const current = authenticated ? authenticatedQuota : anonymousQuota;
      current.inFlight -= 1;
      if (retryAt !== undefined) {
        generation += 1;
        blockedUntil = Math.max(blockedUntil, retryAt);
        authenticatedQuota.remaining = undefined;
        anonymousQuota.remaining = undefined;
        return;
      }
      if (!response || started !== generation) return;
      const header = response.headers.get('X-Discogs-Ratelimit-Remaining');
      if (header === null || !/^\d+$/.test(header)) return;
      const remaining = Math.max(0, Number(header) - current.inFlight);
      if (current.remaining === undefined || remaining < current.remaining) {
        current.remaining = remaining;
        current.observedAt = Date.now();
      }
    },
  };
}

export type DiscogsRequestBudget = ReturnType<typeof createDiscogsRequestBudget>;
