import { z } from 'zod';
import type { Result } from './result';
import { releaseSchema } from './discogs';

export const apiProviderSchema = z.enum(['cosine', 'beatport', 'bandcamp']);
export type ApiProvider = z.infer<typeof apiProviderSchema>;
export const apiProbeInputSchema = z.object({
  provider: apiProviderSchema,
  operation: z.enum(['search', 'lookup', 'similar', 'account']),
  query: z.string().trim().max(2000),
  startYear: z.number().int().min(1900).max(2030).optional(),
  endYear: z.number().int().min(1900).max(2030).optional(),
});
export type ApiProbeInput = z.infer<typeof apiProbeInputSchema>;
export const apiPrototypeStatusSchema = z.object({
  cosine: z.boolean(),
  beatport: z.boolean(),
  bandcamp: z.boolean(),
});
export type ApiPrototypeStatus = z.infer<typeof apiPrototypeStatusSchema>;
export const apiProbeItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  sourceUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  score: z.number().optional(),
});
export const apiProbeReportSchema = z.object({
  provider: apiProviderSchema,
  operation: apiProbeInputSchema.shape.operation,
  endpoint: z.string(),
  httpStatus: z.number(),
  fields: z.array(z.string()),
  items: z.array(apiProbeItemSchema),
  note: z.string(),
});
export type ApiProbeItem = z.infer<typeof apiProbeItemSchema>;
export const apiRecommendationInputSchema = z.object({
  sourceUrl: z.string().max(2048),
  title: z.string().trim().min(1).max(500),
  artist: z.string().trim().min(1).max(500),
});
export type ApiRecommendationInput = z.infer<typeof apiRecommendationInputSchema>;
export const apiRecommendationReleaseSchema = z.object({
  release: releaseSchema,
  trackIndex: z.number().int().nonnegative().nullable(),
});
export type ApiRecommendationRelease = z.infer<typeof apiRecommendationReleaseSchema>;
export type ApiProbeReport = z.infer<typeof apiProbeReportSchema>;
export const apiPrototypeErrorSchema = z.object({
  code: z.enum([
    'invalid-input',
    'unsupported',
    'unauthorized',
    'rate-limited',
    'unavailable',
    'invalid-response',
  ]),
  message: z.string(),
  endpoint: z.string().optional(),
  httpStatus: z.number().optional(),
});
export type ApiPrototypeError = z.infer<typeof apiPrototypeErrorSchema>;
export type ApiPrototypeResult<T> = Result<T, ApiPrototypeError>;
export interface ApiFeasibilityBridge {
  status: () => Promise<ApiPrototypeResult<ApiPrototypeStatus>>;
  configure: (
    provider: ApiProvider,
    token: string,
  ) => Promise<ApiPrototypeResult<ApiPrototypeStatus>>;
  forget: () => Promise<ApiPrototypeResult<ApiPrototypeStatus>>;
  probe: (input: ApiProbeInput) => Promise<ApiPrototypeResult<ApiProbeReport>>;
  loadRecommendation: (
    input: ApiRecommendationInput,
  ) => Promise<ApiPrototypeResult<ApiRecommendationRelease>>;
}
