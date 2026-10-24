import type { DatabaseSync } from 'node:sqlite';

export function upgradeCatalogue(database: DatabaseSync) {
  database.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS download_directories(path TEXT PRIMARY KEY) STRICT;
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      directory TEXT NOT NULL REFERENCES download_directories(path),
      metadata TEXT NOT NULL
    ) STRICT;
    PRAGMA user_version=2;
    COMMIT;
  `);
}
