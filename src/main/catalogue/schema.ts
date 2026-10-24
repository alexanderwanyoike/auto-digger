import type { DatabaseSync } from 'node:sqlite';

export function initialiseCatalogue(database: DatabaseSync) {
  database.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS crates (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, ordinal INTEGER NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS releases (id INTEGER PRIMARY KEY, metadata TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS entries (
      crate_id TEXT NOT NULL REFERENCES crates(id) ON DELETE CASCADE,
      release_id INTEGER NOT NULL REFERENCES releases(id),
      ordinal INTEGER NOT NULL,
      PRIMARY KEY(crate_id, release_id)
    ) STRICT;
    PRAGMA user_version=1;
  `);
}
