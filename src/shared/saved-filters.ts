import { z } from 'zod';
import { filtersSchema, searchInputSchema } from './search';
import type { DigFilters } from './search';
import type { CatalogueResult } from './catalogue';

export const filterPresetSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  filters: filtersSchema,
  page: searchInputSchema.shape.page.default(1),
});
export const savedFiltersSchema = z.object({
  draft: filtersSchema,
  presets: z.array(filterPresetSchema).max(200),
});
export const savePresetSchema = filterPresetSchema.partial({ id: true }).strict();
export const rememberPresetPageSchema = filterPresetSchema
  .pick({ id: true, filters: true })
  .extend({
    page: searchInputSchema.shape.page,
  });
export type SavedFilters = z.infer<typeof savedFiltersSchema>;
export type SavedFiltersResult = CatalogueResult<SavedFilters>;
export interface SavedFiltersBridge {
  read: () => Promise<SavedFiltersResult>;
  saveDraft: (filters: DigFilters) => Promise<SavedFiltersResult>;
  savePreset: (input: z.input<typeof savePresetSchema>) => Promise<SavedFiltersResult>;
  rememberPage: (input: z.infer<typeof rememberPresetPageSchema>) => Promise<SavedFiltersResult>;
  removePreset: (id: string) => Promise<SavedFiltersResult>;
}
