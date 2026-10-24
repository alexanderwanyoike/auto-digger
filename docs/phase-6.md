# Phase 6: A saved crate

Depends on Phase 5. Save the currently loaded EP as a whole release to a local crate, keep insertion order and prevent duplicate release IDs. Show saved status, the crate count and entries. Remove entries and reopen saved metadata/videos for later listening, including while Discogs is disconnected. Reopening a saved record does not require a fresh Discogs API call. YouTube still requires internet and an available video.

Persist validated release metadata in a versioned JSON file at Electron's userData directory. Never store tokens. The renderer gets only list/save/remove operations and cannot choose paths. Validate both IPC directions and senders. Return explicit typed failures. Keep displayed saved state consistent with completed writes and allow retry after failures.

Serialize mutations and replace the file atomically through a temporary file in the same directory. Preserve the existing file on malformed data or write failure. Surface corruption without silently clearing or overwriting it. Bound the crate panel inside the compact workspace and keep the existing light/dark aesthetic.

The persistence pattern follows ISC-licensed npm/write-file-atomic: serialize writes to one target, write a unique sibling temporary file, then rename it (https://github.com/npm/write-file-atomic). No source is copied. Prototype scope excludes cloud sync, named crates, export and native installer packaging.
