import { z } from 'zod';
import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';

export function createSlskdHttp(config: { url: string; apiKey: string }, request: typeof fetch) {
  return async function call<T>(
    path: string,
    schema: z.ZodType<T>,
    method?: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<AudioResult<T>> {
    try {
      const response = await request(`${config.url.replace(/\/+$/, '')}/api/v0${path}`, {
        method: method ?? 'GET',
        redirect: 'error',
        headers: { 'X-API-Key': config.apiKey, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(signal ? [signal] : [])]),
      });
      if (!response.ok)
        return audioFailure(
          'network',
          response.status === 401 || response.status === 403
            ? 'slskd rejected the API key or its permissions. Check Settings.'
            : 'slskd could not complete this request. Check its Soulseek connection and retry.',
        );
      if (response.status === 204) {
        const empty = schema.safeParse(undefined);
        return empty.success
          ? { ok: true, value: empty.data }
          : audioFailure('invalid-data', 'slskd returned an unreadable response.');
      }
      const reader = response.body?.getReader();
      if (!reader) return audioFailure('invalid-data', 'slskd returned an empty response.');
      let size = 0;
      const chunks: Uint8Array[] = [];
      const readNext = async (): Promise<AudioResult<T>> => {
        const next = await reader.read();
        if (next.done) {
          const parsed = schema.safeParse(
            JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown,
          );
          return parsed.success
            ? { ok: true, value: parsed.data }
            : audioFailure('invalid-data', 'slskd returned an unreadable response.');
        }
        size += next.value.length;
        if (size > 8_000_000) {
          await reader.cancel();
          return audioFailure('invalid-data', 'Too many Soulseek results. Refine your search.');
        }
        chunks.push(next.value);
        return readNext();
      };
      return await readNext();
    } catch {
      return audioFailure(
        signal?.aborted ? 'cancelled' : 'network',
        signal?.aborted
          ? 'This Soulseek request was cancelled.'
          : 'Could not reach slskd. Check that it is running and retry.',
      );
    }
  };
}
