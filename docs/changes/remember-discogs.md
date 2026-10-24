# Remember the Discogs account

Remember a verified personal token automatically and restore the account when the app opens, without prompting for the token again. Use Electron 45's asynchronous safeStorage API in the main process, with a fixed encrypted credential file in userData and owner-only file permissions. Never return a saved token to the renderer or log it.

Verify saved credentials through Discogs identity. Preserve them on network/rate-limit failures so Reconnect saved account can retry without retyping. Clear rejected credentials, and let Disconnect or Forget saved token delete the saved credential. File/decryption failures must be explicit typed Results and must preserve recoverable data. Do not silently fall back to plaintext or Electron's basic_text Linux provider.

Use serialized credential operations and atomic file replacement. Keep the existing session API behavior isolated from persistence through composition. Update connection copy to explain remembered credentials and provide retry/forget actions.

Pattern: Electron's MIT-licensed safeStorage asynchronous encryption/decryption and OS credential providers (https://www.electronjs.org/docs/latest/api/safe-storage). The encrypted-file replacement pattern follows the existing crate implementation and npm/write-file-atomic. No upstream implementation is copied.

Acceptance: encrypted save/load across instances; failed writes preserve the previous file; remembered accounts restore after native process restart; disconnect removes credentials; rejected tokens are forgotten; temporary failures retain credentials and permit retry; renderer responses never include the token. Native tests replace the OS encryption boundary and Discogs HTTP with synthetic fixtures, keeping tests out of the user's real keyring.
