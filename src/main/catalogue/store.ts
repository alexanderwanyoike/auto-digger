import type { DatabaseSync } from 'node:sqlite';
import { catalogueFailure } from '../../shared/catalogueFailure';
import type { CatalogueResult, CatalogueView } from '../../shared/catalogue';
import { openCatalogue } from './database';
import { readCatalogueView } from './readView';
import { catalogueMutations } from './mutations';

export function createCatalogueStore(file: string, legacyFile?: string) {
  const ready = openCatalogue(file, legacyFile);
  async function change(
    operation: (mutations: ReturnType<typeof catalogueMutations>) => CatalogueResult<CatalogueView>,
  ): Promise<CatalogueResult<CatalogueView>> {
    const database = await ready;
    if (!database.ok) return database;
    const connection: DatabaseSync = database.value;
    try {
      connection.exec('BEGIN IMMEDIATE');
      const result = operation(catalogueMutations(connection));
      connection.exec(result.ok ? 'COMMIT' : 'ROLLBACK');
      return result;
    } catch {
      if (connection.isTransaction) connection.exec('ROLLBACK');
      return catalogueFailure(
        'storage',
        'The crate change could not be saved. Your catalogue has been preserved.',
      );
    }
  }
  return {
    annotate: (input: unknown) => change((mutations) => mutations.annotate(input)),
    create: (name: unknown) => change((mutations) => mutations.create(name)),
    rename: (input: unknown) => change((mutations) => mutations.rename(input)),
    deleteCrate: (id: unknown) => change((mutations) => mutations.deleteCrate(id)),
    add: (input: unknown) => change((mutations) => mutations.add(input)),
    remove: (input: unknown) => change((mutations) => mutations.remove(input)),
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
