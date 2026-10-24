import type { DatabaseSync } from 'node:sqlite';
import { createResearchStore } from '../research/store';
import { createDownloadIndex } from '../audio/downloadIndex';
import { createPreferencesStore } from '../settings/store';
import { catalogueFailure } from '../../shared/catalogueFailure';
import type { CatalogueResult, CatalogueView } from '../../shared/catalogue';
import { openCatalogue } from './database';
import { readCatalogueView } from './readView';
import { catalogueMutations } from './mutations';

export function createCatalogueStore(file: string, legacyFile?: string) {
  let ready: Promise<CatalogueResult<DatabaseSync>> | undefined;
  let closed = false;
  async function getConnection(): Promise<CatalogueResult<DatabaseSync>> {
    if (closed)
      return catalogueFailure(
        'unavailable',
        'The catalogue is closed. Please restart Auto Digger.',
      );
    ready ??= openCatalogue(file, legacyFile);
    const result = await ready;
    if (!result.ok) ready = undefined;
    return result;
  }
  async function change(
    operation: (mutations: ReturnType<typeof catalogueMutations>) => CatalogueResult<CatalogueView>,
  ): Promise<CatalogueResult<CatalogueView>> {
    const database = await getConnection();
    if (!database.ok) return database;
    const connection: DatabaseSync = database.value;
    if (!connection.isOpen)
      return catalogueFailure(
        'unavailable',
        'The catalogue is closed. Please restart Auto Digger.',
      );
    try {
      connection.exec('BEGIN IMMEDIATE');
      const result = operation(catalogueMutations(connection));
      connection.exec(result.ok ? 'COMMIT' : 'ROLLBACK');
      return result;
    } catch {
      if (connection.isTransaction) {
        try {
          connection.exec('ROLLBACK');
        } catch {
          return catalogueFailure(
            'storage',
            'The catalogue needs to be reopened before more changes can be saved.',
          );
        }
      }
      return catalogueFailure(
        'storage',
        'The crate change could not be saved. Your catalogue has been preserved.',
      );
    }
  }
  return {
    preferences: createPreferencesStore(getConnection),
    downloads: createDownloadIndex(getConnection),
    research: createResearchStore(getConnection),
    annotate: (input: unknown) => change((mutations) => mutations.annotate(input)),
    create: (name: unknown) => change((mutations) => mutations.create(name)),
    rename: (input: unknown) => change((mutations) => mutations.rename(input)),
    deleteCrate: (id: unknown) => change((mutations) => mutations.deleteCrate(id)),
    add: (input: unknown) => change((mutations) => mutations.add(input)),
    remove: (input: unknown) => change((mutations) => mutations.remove(input)),
    async view(crateId?: string): Promise<CatalogueResult<CatalogueView>> {
      const database = await getConnection();
      if (!database.ok) return database;
      if (crateId !== undefined && (!crateId.trim() || crateId.length > 100))
        return catalogueFailure('invalid-input', 'Choose an existing crate.');
      if (!database.value.isOpen)
        return catalogueFailure(
          'unavailable',
          'The catalogue is closed. Please restart Auto Digger.',
        );
      try {
        return readCatalogueView(database.value, crateId);
      } catch {
        return catalogueFailure('storage', 'The catalogue could not be read. Please retry.');
      }
    },
    async close(): Promise<CatalogueResult<undefined>> {
      closed = true;
      if (!ready) return { ok: true, value: undefined };
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
