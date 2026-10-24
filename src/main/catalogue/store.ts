import { catalogueFailure } from '../../shared/catalogueFailure';
import type { CatalogueResult, CatalogueView } from '../../shared/catalogue';
import { openCatalogue } from './database';
import { readCatalogueView } from './readView';

export function createCatalogueStore(file: string, legacyFile?: string) {
  const ready = openCatalogue(file, legacyFile);
  return {
    async view(crateId?: string): Promise<CatalogueResult<CatalogueView>> {
      const database = await ready;
      if (!database.ok) return database;
      try {
        return readCatalogueView(database.value, crateId);
      } catch {
        return catalogueFailure('storage', 'The catalogue could not be read. Please retry.');
      }
    },
    async close(): Promise<CatalogueResult<undefined>> {
      const database = await ready;
      if (!database.ok) return database;
      try {
        if (database.value.isOpen) database.value.close();
        return { ok: true, value: undefined };
      } catch {
        return catalogueFailure('storage', 'The catalogue could not close safely.');
      }
    },
  };
}
