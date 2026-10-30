import { z } from 'zod';
import { cosineQuerySchema } from '../../shared/cosine';
import type { CosineResult } from '../../shared/cosine';
import { cosineFailure } from '../../shared/cosine-failure';
import type { createTokenStore } from '../credentials/token-store';
import { fetchSimilar } from './client';
import { resolveRecommendation } from './resolve';

export function createCosineService(
  store: ReturnType<typeof createTokenStore>,
  request: typeof fetch = (input, init) => fetch(input, init),
) {
  const storageFailure = <T>(): CosineResult<T> =>
    cosineFailure(
      'storage',
      'Unlock your desktop keyring and check device storage to use the saved Cosine key.',
    );
  return {
    async status(): Promise<CosineResult<{ configured: boolean }>> {
      const result = await store.load();
      return result.ok
        ? { ok: true, value: { configured: Boolean(result.value) } }
        : storageFailure();
    },
    async saveKey(input: unknown): Promise<CosineResult<{ configured: boolean }>> {
      const parsed = z
        .string()
        .trim()
        .min(1)
        .max(4096)
        .regex(/^[\x21-\x7E]+$/)
        .safeParse(input);
      if (!parsed.success)
        return cosineFailure('invalid-input', 'Enter your Cosine API key without whitespace.');
      const result = await store.save(parsed.data);
      return result.ok ? { ok: true, value: { configured: true } } : storageFailure();
    },
    async forget(): Promise<CosineResult<{ configured: boolean }>> {
      const result = await store.clear();
      return result.ok ? { ok: true, value: { configured: false } } : storageFailure();
    },
    async similar(input: unknown) {
      const parsed = cosineQuerySchema.safeParse(input);
      if (!parsed.success)
        return cosineFailure<never>(
          'invalid-input',
          'Choose a YouTube upload and a valid year range.',
        );
      const key = await store.load();
      if (!key.ok) return storageFailure<never>();
      if (!key.value)
        return cosineFailure<never>(
          'not-configured',
          'Add your Cosine Club API key in Settings to find similar tracks.',
        );
      return fetchSimilar(parsed.data, key.value, request);
    },
    resolve: (input: unknown) => resolveRecommendation(input, request),
  };
}
