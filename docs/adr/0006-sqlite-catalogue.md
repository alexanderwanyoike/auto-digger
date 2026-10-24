# SQLite catalogue

Accepted 2026-10-24.

Named crates share validated Discogs release snapshots. Membership order and track marks belong to a crate. A pick is a boolean and personal tags are separate strings; neither changes Discogs genre/style metadata. Track identity hashes the position and title, so duration corrections do not move annotations to another track.

Use the SQLite bundled with Electron through `node:sqlite`, with prepared statements, foreign keys, WAL and immediate transactions. This follows the [Node SQLite API](https://nodejs.org/docs/latest-v24.x/api/sqlite.html) and [SQLite transaction](https://www.sqlite.org/lang_transaction.html) patterns. Node is MIT licensed and SQLite is public domain; no source is copied or native addon added. The host Node 22 API is experimental, while the same operations are exercised in Electron's bundled Node runtime.

The main process owns the connection. Preload exposes validated catalogue operations, never SQL or paths. Expected storage, validation and unavailable failures use typed Results. Schema versions use SQLite's `user_version`; a newer catalogue is refused without rewriting it.

On first open, validate `crate.json`, create an exclusive `crate.json.bak`, then import once inside a transaction into `catalog.sqlite`. Recheck the import marker under the write lock for concurrent first opens. Preserve the original JSON and refuse corrupt/unsupported legacy data rather than silently discarding it. A temporary adapter keeps the existing single-crate UI using SQLite until the named-crate screens land.

Back up the catalogue with the app closed, including any `-wal` and `-shm` companion files if present. The token remains separately OS encrypted in `discogs-token.bin`. Audio files and recovery sidecars remain in the music directory in this phase. SQLite is local device storage, with no cloud sync or account relationship.
