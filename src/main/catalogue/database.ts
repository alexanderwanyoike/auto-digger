import { DatabaseSync } from 'node:sqlite';
import { chmod, copyFile, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';
import { readCrate } from '../crate/file';
import { catalogueVersion, upgradeCatalogue } from './upgrade';
import { initialiseCatalogue } from './schema';

export async function openCatalogue(
  file: string,
  legacyFile?: string,
): Promise<CatalogueResult<DatabaseSync>> {
  let database: DatabaseSync | undefined;
  try {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    database = new DatabaseSync(file, { timeout: 5000, allowExtension: false });
    await chmod(file, 0o600);
    const version = database.prepare('PRAGMA user_version').get()?.user_version;
    if (typeof version !== 'number' || version > catalogueVersion) {
      database.close();
      return catalogueFailure(
        'invalid-data',
        'This catalogue has an unsupported version. Its files have been preserved.',
      );
    }
    if (version === 0) {
      if (database.prepare("SELECT name FROM sqlite_master WHERE type='table'").get()) {
        database.close();
        return catalogueFailure(
          'invalid-data',
          'This catalogue schema is unreadable. Its files have been preserved.',
        );
      }
      initialiseCatalogue(database);
    } else {
      database.prepare('SELECT key,value FROM metadata LIMIT 0').all();
      database.prepare('SELECT id,name,ordinal FROM crates LIMIT 0').all();
      database.prepare('SELECT id,metadata FROM releases LIMIT 0').all();
      database.prepare('SELECT crate_id,release_id,ordinal FROM entries LIMIT 0').all();
      database
        .prepare('SELECT crate_id,release_id,track_key,picked,tags FROM track_marks LIMIT 0')
        .all();
      if (
        database.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok' ||
        database.prepare('PRAGMA foreign_key_check').get()
      ) {
        database.close();
        return catalogueFailure(
          'invalid-data',
          'This catalogue is unreadable. Its files have been preserved.',
        );
      }
      if (version >= 2) {
        database.prepare('SELECT path FROM download_directories LIMIT 0').all();
        database.prepare('SELECT id,directory,metadata FROM downloads LIMIT 0').all();
      }
      if (version >= 3)
        database.prepare('SELECT id,crate_id,metadata FROM research_notes LIMIT 0').all();
      database.exec('PRAGMA foreign_keys=ON');
    }
    if (version < catalogueVersion) upgradeCatalogue(database);
    if (!database.prepare("SELECT value FROM metadata WHERE key='legacy-import'").get()) {
      const legacy = legacyFile ? await readCrate(legacyFile) : { ok: true as const, value: [] };
      if (!legacy.ok) {
        database.close();
        return legacy;
      }
      if (legacyFile) {
        try {
          await copyFile(legacyFile, `${legacyFile}.bak`, constants.COPYFILE_EXCL);
        } catch (error) {
          if (!(
            error instanceof Error &&
            'code' in error &&
            (error.code === 'EEXIST' || error.code === 'ENOENT')
          ))
            throw error;
        }
      }
      database.exec('BEGIN IMMEDIATE');
      try {
        if (database.prepare("SELECT value FROM metadata WHERE key='legacy-import'").get()) {
          database.exec('COMMIT');
          return { ok: true, value: database };
        }
        database
          .prepare("INSERT OR IGNORE INTO crates(id,name,ordinal) VALUES('default','My crate',0)")
          .run();
        const release = database.prepare('INSERT OR IGNORE INTO releases(id,metadata) VALUES(?,?)');
        const entry = database.prepare(
          "INSERT OR IGNORE INTO entries(crate_id,release_id,ordinal) VALUES('default',?,?)",
        );
        legacy.value.forEach((record, index) => {
          release.run(record.id, JSON.stringify(record));
          entry.run(record.id, index);
        });
        database
          .prepare("INSERT INTO metadata(key,value) VALUES('legacy-import','complete')")
          .run();
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    }
    return { ok: true, value: database };
  } catch {
    if (database?.isOpen) database.close();
    return catalogueFailure(
      'storage',
      'The catalogue could not be opened. Existing files have been preserved. Check device storage and retry.',
    );
  }
}
