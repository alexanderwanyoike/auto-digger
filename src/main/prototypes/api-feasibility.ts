import { z } from 'zod';
import {
  apiProbeInputSchema,
  apiProbeReportSchema,
  apiProviderSchema,
} from '../../shared/api-feasibility-prototype';
import type {
  ApiProbeReport,
  ApiPrototypeResult,
  ApiPrototypeStatus,
  ApiProvider,
} from '../../shared/api-feasibility-prototype';
import { apiProbeRequest } from './api-probe-request';
import { apiProbeResponse } from './api-probe-response';

export function createApiFeasibilityPrototype(fetcher: typeof fetch = fetch) {
  const credentials = new Map<ApiProvider, string>();
  const status = (): ApiPrototypeResult<ApiPrototypeStatus> => ({
    ok: true,
    value: {
      cosine: credentials.has('cosine'),
      beatport: credentials.has('beatport'),
      bandcamp: credentials.has('bandcamp'),
    },
  });
  return {
    status,
    configure(input: unknown): ApiPrototypeResult<ApiPrototypeStatus> {
      const parsed = z
        .object({
          provider: apiProviderSchema,
          token: z
            .string()
            .trim()
            .min(1)
            .max(4096)
            .regex(/^[\x21-\x7E]+$/),
        })
        .safeParse(input);
      if (!parsed.success)
        return {
          ok: false,
          error: {
            code: 'invalid-input',
            message: 'Enter your own API key or access token without whitespace.',
          },
        };
      credentials.set(parsed.data.provider, parsed.data.token);
      return status();
    },
    forget() {
      credentials.clear();
      return status();
    },
    async probe(input: unknown): Promise<ApiPrototypeResult<ApiProbeReport>> {
      const parsed = apiProbeInputSchema.safeParse(input);
      if (!parsed.success)
        return {
          ok: false,
          error: { code: 'invalid-input', message: 'Choose a service and valid probe parameters.' },
        };
      const request = apiProbeRequest(parsed.data);
      if (!request.ok) return request;
      const token = credentials.get(parsed.data.provider);
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'User-Agent':
          'AutoDigger-API-Prototype/0.1 (https://github.com/alexanderwanyoike/auto-digger)',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        const response = await fetcher(request.value.url, {
          method: request.value.method,
          headers,
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
        });
        const evidence = { endpoint: request.value.url, httpStatus: response.status };
        if (!response.ok) {
          if (response.status === 429)
            return {
              ok: false,
              error: {
                ...evidence,
                code: 'rate-limited',
                message: 'Rate limit reached. Wait before running another check.',
              },
            };
          if ([401, 403].includes(response.status))
            return {
              ok: false,
              error: {
                ...evidence,
                code: 'unauthorized',
                message: 'The service rejected access. Check your API credentials and permissions.',
              },
            };
          return {
            ok: false,
            error: {
              ...evidence,
              code: 'unavailable',
              message: `The service returned HTTP ${response.status.toString()}. No catalogue capability has been verified.`,
            },
          };
        }
        const body: unknown = await response.json();
        const result = apiProbeResponse(parsed.data, body);
        if (!result.ok) return { ok: false, error: { ...result.error, ...evidence } };
        const report = { ...parsed.data, ...evidence, ...result.value };
        let safe = JSON.stringify(report);
        credentials.forEach((secret) => {
          safe = safe.split(secret).join('[redacted]');
        });
        const value: unknown = JSON.parse(safe);
        const checked = apiProbeReportSchema.safeParse(value);
        if (checked.success) return { ok: true, value: checked.data };
        return {
          ok: false,
          error: {
            code: 'invalid-response',
            message: 'The probe report could not be read.',
            ...evidence,
          },
        };
      } catch {
        return {
          ok: false,
          error: {
            code: 'unavailable',
            message: 'The request failed or timed out. Check connectivity before retrying.',
            endpoint: request.value.url,
          },
        };
      }
    },
  };
}
