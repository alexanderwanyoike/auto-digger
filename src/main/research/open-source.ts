import { z } from 'zod';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogue-failure';
import type { createResearchStore } from './store';

const sourceSchema = z
  .object({
    crateId: z.string().min(1).max(100),
    noteId: z.uuid(),
    sourceIndex: z.number().int().min(-1).max(9),
  })
  .strict();
export async function openResearchSource(
  store: ReturnType<typeof createResearchStore>,
  input: unknown,
  open: (url: string) => Promise<void>,
): Promise<CatalogueResult<undefined>> {
  const parsed = sourceSchema.safeParse(input);
  if (!parsed.success) return catalogueFailure('invalid-input', 'Choose a saved research source.');
  const result = await store.list(parsed.data.crateId);
  if (!result.ok) return result;
  const note = result.value.find((item) => item.id === parsed.data.noteId);
  const url =
    parsed.data.sourceIndex === -1 ? note?.mixUrl : note?.sourceUrls[parsed.data.sourceIndex];
  if (!url) return catalogueFailure('invalid-input', 'This saved source could not be found.');
  try {
    await open(url);
    return { ok: true, value: undefined };
  } catch {
    return catalogueFailure(
      'unavailable',
      'The source could not open in your browser. Please retry.',
    );
  }
}
