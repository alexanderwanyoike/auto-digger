# Local MCP mix research

Accepted for the experimental mix-research phase.

The AI host performs source research. Auto Digger exposes a narrow catalogue/Discogs tool set over the official MCP SDK's stdio transport. A separate Node process communicates with the running app through an authenticated loopback endpoint. The main process remains the sole owner of SQLite and the encrypted Discogs token. This avoids a second writer, duplicated credential handling and custom MCP protocol code.

Access is opt-in for each app session, and revocable. Client configuration contains the executable and private connection-file path, with no session key or Discogs token. Host, origin, body size and tool input checks protect the loopback boundary. App shutdown stops access before closing SQLite. Electron's single-instance lock gives each profile one connection owner.

Schema version 3 adds crate-owned research notes. Exact release IDs and stable track keys distinguish metadata verification from the host's recording-match judgment. Notes retain origin mix links, supporting sources, timestamps and uncertainty. A confirmed new note requires a saved release/track reference. Personal picks/tags retain their existing crate membership boundary.

Use prepared statements and typed Results. Source buttons resolve stored note IDs in main before opening validated HTTPS evidence. Do not add automated web scraping, audio downloads, arbitrary SQL, remote transport or global host configuration changes to this phase.

The patterns and licences are recorded in [the feature specification](../features/mix-research.md).
