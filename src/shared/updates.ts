import { z } from 'zod';
import type { Result } from './result';

const version = z.string().regex(/^\d+\.\d+\.\d+$/);
export const updateStateSchema = z.discriminatedUnion('stage', [
  z.object({ stage: z.literal('disabled') }),
  z.object({ stage: z.literal('idle') }),
  z.object({ stage: z.literal('checking') }),
  z.object({ stage: z.literal('available'), version, manual: z.boolean() }),
  z.object({ stage: z.literal('downloading'), version, percent: z.number().int().min(0).max(100) }),
  z.object({ stage: z.literal('ready'), version }),
]);
export type UpdateState = z.infer<typeof updateStateSchema>;
export type UpdateResult<T> = Result<T, string>;
export interface UpdatesBridge {
  status: () => Promise<UpdateResult<UpdateState>>;
  check: () => Promise<UpdateResult<UpdateState>>;
  download: () => Promise<UpdateResult<UpdateState>>;
  install: () => Promise<UpdateResult<UpdateState>>;
}
