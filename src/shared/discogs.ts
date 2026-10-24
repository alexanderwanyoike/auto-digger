import { z } from 'zod';
import type { Result } from './result';

export const accountSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
});
export type DiscogsAccount = z.infer<typeof accountSchema>;

export const discogsErrorSchema = z.object({
  code: z.enum([
    'invalid-input',
    'unauthorized',
    'rate-limited',
    'not-found',
    'network',
    'invalid-response',
    'unavailable',
    'cancelled',
  ]),
  message: z.string(),
});
export type DiscogsError = z.infer<typeof discogsErrorSchema>;
export type DiscogsResult<T> = Result<T, DiscogsError>;

export function discogsFailure(code: DiscogsError['code'], message: string): DiscogsResult<never> {
  return { ok: false, error: { code, message } };
}
