import { z } from 'zod';
import {
  apiProbeReportSchema,
  apiRecommendationReleaseSchema,
  apiPrototypeErrorSchema,
  apiPrototypeStatusSchema,
} from '../shared/api-feasibility-prototype';
import type { ApiFeasibilityBridge, ApiPrototypeResult } from '../shared/api-feasibility-prototype';

export function createApiFeasibilityBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): ApiFeasibilityBridge {
  async function call<T>(
    operation: string,
    schema: z.ZodType<T>,
    input?: unknown,
  ): Promise<ApiPrototypeResult<T>> {
    try {
      const parsed = z
        .discriminatedUnion('ok', [
          z.object({ ok: z.literal(true), value: schema }),
          z.object({ ok: z.literal(false), error: apiPrototypeErrorSchema }),
        ])
        .safeParse(await invoke(`api-feasibility:${operation}`, input));
      if (parsed.success) return parsed.data;
    } catch {
      /* Native errors may contain credential details. */
    }
    return {
      ok: false,
      error: { code: 'unavailable', message: 'Restart the API prototype and try again.' },
    };
  }
  return {
    status: () => call('status', apiPrototypeStatusSchema),
    configure: (provider, token) =>
      call('configure', apiPrototypeStatusSchema, { provider, token }),
    forget: () => call('forget', apiPrototypeStatusSchema),
    probe: (input) => call('probe', apiProbeReportSchema, input),
    loadRecommendation: (input) => call('release', apiRecommendationReleaseSchema, input),
  };
}
