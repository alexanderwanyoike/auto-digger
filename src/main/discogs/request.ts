import type { z } from 'zod';
import { discogsFailure } from '../../shared/discogs';
import type { DiscogsResult } from '../../shared/discogs';

export async function requestDiscogs<T>(
  path: string,
  token: string,
  schema: z.ZodType<T>,
  request: typeof fetch,
): Promise<DiscogsResult<T>> {
  let response: Response;
  try {
    response = await request(`https://api.discogs.com${path}`, {
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': 'AutoDigger/0.1 (+https://github.com/alexanderwanyoike/auto-digger)',
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
  } catch {
    return discogsFailure(
      'network',
      'Could not reach Discogs. Check your connection and try again.',
    );
  }
  if (!response.ok) {
    return discogsFailure('network', 'Discogs could not complete the request. Please try again.');
  }
  try {
    const raw: unknown = await response.json();
    const parsed = schema.safeParse(raw);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : discogsFailure('invalid-response', 'Discogs returned metadata the app could not read.');
  } catch {
    return discogsFailure('invalid-response', 'Discogs returned metadata the app could not read.');
  }
}
