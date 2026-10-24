import { z } from 'zod';
import { crateErrorSchema } from '../shared/crate';
import { catalogueFailure } from '../shared/catalogueFailure';
import { researchAccessChannels, researchAccessSchema } from '../shared/researchAccess';
import type { CatalogueResult } from '../shared/catalogue';
import type { ResearchAccess, ResearchAccessBridge } from '../shared/researchAccess';

export function createResearchAccessBridge(
  invoke: (channel: string) => Promise<unknown>,
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
    status: () => call(researchAccessChannels.status),
    start: () => call(researchAccessChannels.start),
    stop: () => call(researchAccessChannels.stop),
  };
}
