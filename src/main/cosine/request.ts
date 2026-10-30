import type { z } from 'zod';
import type { CosineResult } from '../../shared/cosine';
import { cosineFailure } from '../../shared/cosine-failure';

export function createCosineRequest(key: string, request: typeof fetch) {
  return async function read<T>(path: string, schema: z.ZodType<T>): Promise<CosineResult<T>> {
    const signal = AbortSignal.timeout(45000);
    try {
      const response = await request(`https://cosine.club/api/v1/${path}`, {
        headers: {
          Authorization: `Bearer ${key}`,
          'User-Agent': 'AutoDigger/0.1 (https://github.com/alexanderwanyoike/auto-digger)',
          Accept: 'application/json',
        },
        redirect: 'error',
        signal,
      });
      if ([401, 403].includes(response.status))
        return cosineFailure('unauthorized', 'Cosine rejected the API key. Update it in Settings.');
      if (response.status === 404)
        return cosineFailure(
          'not-found',
          'Cosine has not indexed this upload. Try another upload of the track.',
        );
      if (response.status === 429)
        return cosineFailure(
          'rate-limited',
          'Cosine is busy. Wait a minute before requesting more recommendations.',
        );
      if (!response.ok)
        return cosineFailure('network', 'Cosine could not complete the request. Please retry.');
      const raw: unknown = await response.json();
      const clean: unknown = JSON.parse(
        JSON.stringify(raw, (_name, value: unknown) =>
          typeof value === 'string' ? value.split(key).join('[redacted]') : value,
        ),
      );
      const parsed = schema.safeParse(clean);
      return parsed.success
        ? { ok: true, value: parsed.data }
        : cosineFailure(
            'invalid-response',
            'Cosine returned recommendations the app could not read.',
          );
    } catch (error) {
      const name =
        typeof error === 'object' && error !== null && 'name' in error ? error.name : null;
      if (signal.aborted || name === 'TimeoutError')
        return cosineFailure('timeout', 'Cosine took too long to respond. Please try again.');
      if (name === 'SyntaxError')
        return cosineFailure(
          'invalid-response',
          'Cosine returned a response the app could not read. Please retry.',
        );
      return cosineFailure('network', 'Could not reach Cosine. Check your connection and retry.');
    }
  };
}
