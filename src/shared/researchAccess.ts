import { z } from 'zod';
import type { CatalogueResult } from './catalogue';

export const researchConnectionSchema = z
  .object({
    url: z.string().refine((value) => {
      try {
        const url = new URL(value);
        return (
          url.protocol === 'http:' &&
          url.hostname === '127.0.0.1' &&
          url.port !== '' &&
          url.pathname === '/research' &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash
        );
      } catch {
        return false;
      }
    }),
    key: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const researchAccessSchema = z.object({
  enabled: z.boolean(),
  configuration: z.object({ command: z.literal('node'), args: z.array(z.string()).length(3) }),
});
export type ResearchAccess = z.infer<typeof researchAccessSchema>;
export interface ResearchAccessBridge {
  status: () => Promise<CatalogueResult<ResearchAccess>>;
  start: () => Promise<CatalogueResult<ResearchAccess>>;
  stop: () => Promise<CatalogueResult<ResearchAccess>>;
}
export const researchAccessChannels = {
  status: 'research:status',
  start: 'research:start',
  stop: 'research:stop',
} as const;
