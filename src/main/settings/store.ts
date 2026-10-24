import type { DatabaseSync } from 'node:sqlite';
import { isAbsolute } from 'node:path';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';
import { defaultPreferences, preferencesSchema } from '../../shared/preferences';
import type { PreferencesResult } from '../../shared/preferences';

export function createPreferencesStore(connection: () => Promise<CatalogueResult<DatabaseSync>>) {
  async function read(): Promise<PreferencesResult> {
    const result = await connection();
    if (!result.ok) return result;
    try {
      const row = result.value.prepare("SELECT value FROM metadata WHERE key='preferences'").get();
      if (!row) return { ok: true, value: defaultPreferences };
      const json: unknown = typeof row.value === 'string' ? JSON.parse(row.value) : null;
      const parsed = preferencesSchema.safeParse(json);
      if (parsed.success) return { ok: true, value: parsed.data };
    } catch {
      return catalogueFailure('storage', 'Your settings could not be read. Please retry.');
    }
    return catalogueFailure(
      'invalid-data',
      'Saved settings are unreadable. Their data has been preserved.',
    );
  }
  return {
    read,
    async save(input: unknown): Promise<PreferencesResult> {
      const parsed = preferencesSchema.safeParse(input);
      if (!parsed.success || (parsed.data.directory !== null && !isAbsolute(parsed.data.directory)))
        return catalogueFailure('invalid-input', 'Choose valid appearance and download settings.');
      const existing = await read();
      if (!existing.ok) return existing;
      const result = await connection();
      if (!result.ok) return result;
      try {
        result.value
          .prepare(
            "INSERT INTO metadata(key,value) VALUES('preferences',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          )
          .run(JSON.stringify(parsed.data));
        return { ok: true, value: parsed.data };
      } catch {
        return catalogueFailure('storage', 'Your settings could not be saved. Please retry.');
      }
    },
  };
}
