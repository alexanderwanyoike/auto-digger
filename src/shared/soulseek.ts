import { z } from 'zod';
import type { AudioResult } from './audio';

export const soulseekMatchSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{32}$/),
  username: z.string().min(1).max(256),
  filename: z.string().min(1).max(4096),
  size: z.number().int().positive().max(2_000_000_000),
  bitRate: z.number().nullable(),
  length: z.number().nullable(),
  access: z.enum(['public', 'private']),
});
export type SoulseekMatch = z.infer<typeof soulseekMatchSchema>;
export const soulseekResultsSchema = z.object({
  complete: z.boolean(),
  privateCount: z.number().int().nonnegative(),
  matches: z.array(soulseekMatchSchema).max(1000),
});
export type SoulseekResults = z.infer<typeof soulseekResultsSchema>;
export const soulseekSettingsSchema = z.object({
  url: z
    .string()
    .max(2048)
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash &&
          (url.protocol === 'https:' ||
            (url.protocol === 'http:' &&
              ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
        );
      } catch {
        return false;
      }
    }),
  directory: z.string().min(1).max(4096),
  apiKey: z.string().max(1024),
});
export type SoulseekSettings = z.infer<typeof soulseekSettingsSchema>;
export const soulseekStatusSchema = soulseekSettingsSchema
  .omit({ apiKey: true })
  .extend({ configured: z.boolean() });
export type SoulseekStatus = z.infer<typeof soulseekStatusSchema>;
export const soulseekSearchSchema = z.object({ id: z.string(), query: z.string() });
export interface SoulseekBridge {
  settings: () => Promise<AudioResult<SoulseekStatus | null>>;
  configure: (input: SoulseekSettings) => Promise<AudioResult<SoulseekStatus>>;
  disconnect: () => Promise<AudioResult<undefined>>;
  search: (query: string) => Promise<AudioResult<z.infer<typeof soulseekSearchSchema>>>;
  results: (id: string) => Promise<AudioResult<SoulseekResults>>;
  stop: (id: string) => Promise<AudioResult<undefined>>;
}
export function cleanSoulseekQuery(query: string): string {
  return query.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
