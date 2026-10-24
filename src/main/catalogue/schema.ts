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
    CREATE TABLE IF NOT EXISTS track_marks (
      crate_id TEXT NOT NULL,
      release_id INTEGER NOT NULL,
      track_key TEXT NOT NULL,
      picked INTEGER NOT NULL CHECK(picked IN (0,1)),
      tags TEXT NOT NULL,
      PRIMARY KEY(crate_id,release_id,track_key),
      FOREIGN KEY(crate_id,release_id) REFERENCES entries(crate_id,release_id) ON DELETE CASCADE
    ) STRICT;
    PRAGMA user_version=1;
  `);
}
