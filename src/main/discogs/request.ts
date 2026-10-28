import type { z } from 'zod';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsResult } from '../../shared/discogs';

export async function requestDiscogs<T>(
  path: string,
  token: string | null,
  schema: z.ZodType<T>,
  request: typeof fetch,
  signal?: AbortSignal,
): Promise<DiscogsResult<T>> {
  let response: Response;
  try {
    response = await request(`https://api.discogs.com${path}`, {
      headers: {
        ...(token ? { Authorization: `Discogs token=${token}` } : {}),
        'User-Agent': 'AutoDigger/0.1 (+https://github.com/alexanderwanyoike/auto-digger)',
      },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
        : AbortSignal.timeout(10_000),
      redirect: 'error',
    });
  } catch {
    if (signal?.aborted) return discogsFailure('cancelled', 'This Discogs request was cancelled.');
    return discogsFailure(
      'network',
      'Could not reach Discogs. Check your connection and try again.',
    );
  }
  if (response.status === 401 || response.status === 403) {
    return discogsFailure(
      'unauthorized',
      'Discogs rejected this token. Connect again with a valid personal token.',
    );
  }
  if (response.status === 429) {
    return discogsFailure(
      'rate-limited',
      'Discogs rate limit reached. Please wait a minute and try again.',
    );
  }
  if (response.status === 404) {
    return discogsFailure('not-found', 'That release was not found on Discogs.');
  }
  if (!response.ok) {
    return discogsFailure('network', 'Discogs could not complete the request. Please try again.');
  }
  let raw: unknown;
  try {
    raw = await response.json();
  } catch (error) {
    if (signal?.aborted) return discogsFailure('cancelled', 'This Discogs request was cancelled.');
    const malformed =
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'SyntaxError';
    return malformed
      ? discogsFailure('invalid-response', 'Discogs returned metadata the app could not read.')
      : discogsFailure(
          'network',
          'Could not read the response from Discogs. Check your connection and try again.',
        );
  }
  const parsed = schema.safeParse(raw);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : discogsFailure('invalid-response', 'Discogs returned metadata the app could not read.');
}
