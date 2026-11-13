import type { DatabaseSync } from 'node:sqlite';

export const catalogueVersion = 7;

export function upgradeCatalogue(database: DatabaseSync) {
  database.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS download_directories(path TEXT PRIMARY KEY) STRICT;
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      directory TEXT NOT NULL REFERENCES download_directories(path),
      metadata TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS research_notes (
      id TEXT PRIMARY KEY,
      crate_id TEXT NOT NULL REFERENCES crates(id) ON DELETE CASCADE,
      metadata TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS follows (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('artist', 'label', 'genre')),
      name TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS opened_releases (id INTEGER PRIMARY KEY) STRICT;
    CREATE TABLE IF NOT EXISTS personal_crate_saves (
      crate_id TEXT NOT NULL,
      release_id INTEGER NOT NULL,
      PRIMARY KEY(crate_id, release_id),
      FOREIGN KEY(crate_id, release_id) REFERENCES entries(crate_id, release_id) ON DELETE CASCADE
    ) STRICT;
    PRAGMA user_version=${catalogueVersion.toString()};
    COMMIT;
  `);
}
