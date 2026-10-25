import { z } from 'zod';
import { filtersSchema } from './search';
import type { DigFilters } from './search';
import type { CatalogueResult } from './catalogue';

export const filterPresetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  filters: filtersSchema,
});
export const savedFiltersSchema = z.object({
  draft: filtersSchema,
  presets: z.array(filterPresetSchema).max(200),
});
export const savePresetSchema = filterPresetSchema.partial({ id: true }).strict();
export type SavedFilters = z.infer<typeof savedFiltersSchema>;
export type SavedFiltersResult = CatalogueResult<SavedFilters>;
export const emptyFilters: DigFilters = filtersSchema.parse({});
export interface SavedFiltersBridge {
  read: () => Promise<SavedFiltersResult>;
  saveDraft: (filters: DigFilters) => Promise<SavedFiltersResult>;
  savePreset: (input: z.infer<typeof savePresetSchema>) => Promise<SavedFiltersResult>;
  removePreset: (id: string) => Promise<SavedFiltersResult>;
}
