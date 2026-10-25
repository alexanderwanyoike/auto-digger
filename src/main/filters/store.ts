import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';
import { filtersSchema } from '../../shared/search';
import { emptyFilters, savedFiltersSchema, savePresetSchema } from '../../shared/savedFilters';
import type { SavedFilters, SavedFiltersResult } from '../../shared/savedFilters';

function readSnapshot(database: DatabaseSync): SavedFiltersResult {
  const row = database.prepare("SELECT value FROM metadata WHERE key='digging-filters'").get();
  if (!row) return { ok: true, value: { draft: emptyFilters, presets: [] } };
  try {
    const json: unknown = typeof row.value === 'string' ? JSON.parse(row.value) : null;
    const parsed = savedFiltersSchema.safeParse(json);
    if (parsed.success) return { ok: true, value: parsed.data };
  } catch {
    // Preserve unreadable presets rather than replacing them with an empty selection.
  }
  return catalogueFailure(
    'invalid-data',
    'Saved filters could not be read. Their data has been preserved.',
  );
}

export function createSavedFiltersStore(connection: () => Promise<CatalogueResult<DatabaseSync>>) {
  async function change(
    update?: (current: SavedFilters) => SavedFiltersResult,
  ): Promise<SavedFiltersResult> {
    const result = await connection();
    if (!result.ok) return result;
    try {
      const current = readSnapshot(result.value);
      if (!current.ok || !update) return current;
      const next = update(current.value);
      if (!next.ok) return next;
      result.value
        .prepare(
          "INSERT INTO metadata(key,value) VALUES('digging-filters',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .run(JSON.stringify(next.value));
      return next;
    } catch {
      return catalogueFailure('storage', 'Your filters could not be saved or read. Please retry.');
    }
  }
  return {
    read: () => change(),
    saveDraft(input: unknown): Promise<SavedFiltersResult> {
      const parsed = filtersSchema.safeParse(input);
      if (!parsed.success)
        return Promise.resolve(
          catalogueFailure('invalid-input', 'Choose valid filters and a year or year range.'),
        );
      return change((current) => ({ ok: true, value: { ...current, draft: parsed.data } }));
    },
    savePreset(input: unknown): Promise<SavedFiltersResult> {
      const parsed = savePresetSchema.safeParse(input);
      if (!parsed.success)
        return Promise.resolve(
          catalogueFailure('invalid-input', 'Give these filters a name and a valid year or range.'),
        );
      return change((current) => {
        const { id, name, filters } = parsed.data;
        if (id && !current.presets.some((preset) => preset.id === id))
          return catalogueFailure('invalid-input', 'These saved filters no longer exist.');
        if (
          current.presets.some(
            (preset) => preset.id !== id && preset.name.toLowerCase() === name.toLowerCase(),
          )
        )
          return catalogueFailure(
            'invalid-input',
            'You already have saved filters with this name.',
          );
        if (!id && current.presets.length >= 200)
          return catalogueFailure('invalid-input', 'Remove some saved filters before adding more.');
        const preset = { id: id ?? randomUUID(), name, filters };
        const presets = id
          ? current.presets.map((item) => (item.id === id ? preset : item))
          : [...current.presets, preset];
        return { ok: true, value: { ...current, presets } };
      });
    },
    removePreset(input: unknown): Promise<SavedFiltersResult> {
      const parsed = z.uuid().safeParse(input);
      if (!parsed.success)
        return Promise.resolve(
          catalogueFailure('invalid-input', 'Choose saved filters to remove.'),
        );
      return change((current) => ({
        ok: true,
        value: {
          ...current,
          presets: current.presets.filter((preset) => preset.id !== parsed.data),
        },
      }));
    },
  };
}
