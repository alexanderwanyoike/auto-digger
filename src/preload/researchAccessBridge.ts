import { z } from 'zod';
import { crateErrorSchema } from '../shared/crate';
import { catalogueFailure } from '../shared/catalogueFailure';
import { researchAccessChannels, researchAccessSchema } from '../shared/researchAccess';
import type { CatalogueResult } from '../shared/catalogue';
import type { ResearchAccess, ResearchAccessBridge } from '../shared/researchAccess';

export function createResearchAccessBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): ResearchAccessBridge {
  const responseSchema = z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), value: researchAccessSchema }),
    z.object({ ok: z.literal(false), error: crateErrorSchema }),
  ]);
  const call = async (channel: string): Promise<CatalogueResult<ResearchAccess>> => {
    try {
      const parsed = responseSchema.safeParse(await invoke(channel));
      if (parsed.success) return parsed.data;
    } catch {
      return catalogueFailure(
        'unavailable',
        'Research settings could not be reached. Please retry.',
      );
    }
    return catalogueFailure('unavailable', 'Research settings could not be read. Please retry.');
  };
  return {
    openSource: async (input) => {
      try {
        const result = z
          .discriminatedUnion('ok', [
            z.object({ ok: z.literal(true), value: z.undefined() }),
            z.object({ ok: z.literal(false), error: crateErrorSchema }),
          ])
          .safeParse(await invoke(researchAccessChannels.openSource, input));
        if (result.success) return result.data;
      } catch {
        return catalogueFailure<undefined>(
          'unavailable',
          'The research source could not open. Please retry.',
        );
      }
      return catalogueFailure<undefined>(
        'unavailable',
        'The research source could not be reached.',
      );
    },
    status: () => call(researchAccessChannels.status),
    start: () => call(researchAccessChannels.start),
    stop: () => call(researchAccessChannels.stop),
  };
}
