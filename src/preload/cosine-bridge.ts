import { z } from 'zod';
import {
  cosineErrorSchema,
  cosineStatusSchema,
  recommendationsSchema,
  resolvedRecommendationSchema,
} from '../shared/cosine';
import type { CosineBridge, CosineResult } from '../shared/cosine';
import { cosineFailure } from '../shared/cosine-failure';

export function createCosineBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): CosineBridge {
  async function call<T>(
    method: string,
    schema: z.ZodType<T>,
    input?: unknown,
  ): Promise<CosineResult<T>> {
    try {
      const parsed = z
        .discriminatedUnion('ok', [
          z.object({ ok: z.literal(true), value: schema }),
          z.object({ ok: z.literal(false), error: cosineErrorSchema }),
        ])
        .safeParse(await invoke(`cosine:${method}`, input));
      return parsed.success
        ? parsed.data
        : cosineFailure(
            'invalid-response',
            'The desktop returned a Cosine response the app could not read.',
          );
    } catch {
      return cosineFailure(
        'unavailable',
        'Cosine could not be reached. Restart Auto Digger and retry.',
      );
    }
  }
  return {
    status: () => call('status', cosineStatusSchema),
    saveKey: (key) => call('save-key', cosineStatusSchema, key),
    forget: () => call('forget', cosineStatusSchema),
    similar: (input) => call('similar', recommendationsSchema, input),
    resolve: (item) => call('resolve', resolvedRecommendationSchema, item),
  };
}
