import { z } from 'zod';
import { releaseSchema } from './discogs';
import { videoId } from './youtube-video-id';
import type { Result } from './result';

export const cosineErrorSchema = z.object({
  code: z.enum([
    'invalid-input',
    'not-configured',
    'unauthorized',
    'not-found',
    'ambiguous',
    'rate-limited',
    'network',
    'invalid-response',
    'storage',
    'unavailable',
  ]),
  message: z.string(),
});
export type CosineError = z.infer<typeof cosineErrorSchema>;
export type CosineResult<T> = Result<T, CosineError>;
export const cosineStatusSchema = z.object({ configured: z.boolean() });
export const recommendationSchema = z.object({
  id: z.string().min(1).max(100),
  artist: z.string().min(1).max(500),
  title: z.string().min(1).max(500),
  youtubeUrl: z.string().max(2048).nullable(),
  releaseId: z.number().int().positive().nullable(),
});
export type Recommendation = z.infer<typeof recommendationSchema>;
export const recommendationsSchema = z.object({
  seed: recommendationSchema,
  seeds: z.array(recommendationSchema).max(11).optional(),
  tracks: z.array(recommendationSchema).max(10),
});
export type Recommendations = z.infer<typeof recommendationsSchema>;
export const cosineQuerySchema = z
  .object({
    url: z
      .string()
      .max(2048)
      .refine((url) => videoId(url) !== null),
    artist: z.string().trim().min(1).max(500).optional(),
    title: z.string().trim().min(1).max(500).optional(),
    fromYear: z.number().int().min(1900).max(2030).optional(),
    toYear: z.number().int().min(1900).max(2030).optional(),
  })
  .refine((value) => (value.artist === undefined) === (value.title === undefined))
  .refine(
    (value) =>
      value.fromYear === undefined || value.toYear === undefined || value.fromYear <= value.toYear,
  );
export type CosineQuery = z.infer<typeof cosineQuerySchema>;
export const resolvedRecommendationSchema = z.object({
  release: releaseSchema,
  videoIndex: z.number().int().nonnegative().nullable(),
  trackIndex: z.number().int().nonnegative().nullable(),
});
export type ResolvedRecommendation = z.infer<typeof resolvedRecommendationSchema>;
export interface CosineBridge {
  status: () => Promise<CosineResult<{ configured: boolean }>>;
  saveKey: (key: string) => Promise<CosineResult<{ configured: boolean }>>;
  forget: () => Promise<CosineResult<{ configured: boolean }>>;
  similar: (input: CosineQuery) => Promise<CosineResult<Recommendations>>;
  resolve: (item: Recommendation) => Promise<CosineResult<ResolvedRecommendation>>;
}
