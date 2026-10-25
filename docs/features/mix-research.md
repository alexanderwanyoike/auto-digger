# Experimental mix research

An MCP client such as Codex or Claude researches a mix, identifies its recordings, and saves whole Discogs releases with the relevant track picks and personal tags into a named crate. SQLite stores the resulting research beside the crate. The host supplies its own research capabilities; Auto Digger is the local catalogue and Discogs boundary.

## Workflow

1. Enable MCP in Settings and copy the client configuration. Access starts disabled and ends on disable or app exit. No host configuration is changed automatically.
2. The host identifies the requested mix and its tracklist from source evidence. Search Discogs across all formats, then inspect specific release IDs. Ordinary random digging uses the selected release types and keeps its applied filters/history independent.
3. Prefer original single/EP releases while preserving exact mix/version identity and alternatives. Add releases using IDs fetched through the app's authenticated Discogs session. Arbitrary client-supplied release snapshots are rejected.
4. Read stable track keys, pick the matching tracks and set personal tags within the chosen crate. Updates appear in the open app without switching the user's active crate.
5. Save mix URL, supporting source URLs, track number, timestamp, certainty and notes. Confirmed evidence requires a saved release and track key. Ambiguous matches remain candidates and unidentified items remain unresolved. Reuse a note's ID when updating it. The host supplies certainty; the app validates references and metadata rather than proving a recording match.
6. Crates shows the research and lets the user open saved sources. Picks, tags and evidence survive restart. Source opening uses note IDs and recorded URLs, never arbitrary renderer-provided destinations.

The tools are `list_crates`, `get_crate`, `create_crate`, `search_releases`, `get_release`, `add_release`, `annotate_track` and `save_research`. They expose no credential, arbitrary SQL, filesystem, download or remote-administration operation. Existing crate UI handles removal and renaming.

## Local connection

The official MCP TypeScript SDK v2 serves stdio in a separate Node process. It supports current and legacy protocol negotiation through `serveStdio`. The app owns SQLite and the encrypted Discogs credential. An ephemeral authenticated loopback bridge forwards only typed research operations to the running app. It rejects browser-origin requests, unexpected hosts and oversized bodies. A private owner-readable connection file keeps its random session key out of user-facing configuration; disabling access revokes it and aborts pending requests. A single desktop instance owns each profile's connection.

This is a local experimental connection. Claude Desktop uses an exported MCP bundle and its own Node runtime. Other local clients use the installed Auto Digger executable in Electron Node mode, with `ELECTRON_RUN_AS_NODE=1`. No separate Node installation is needed for MCP. The helper uses the same local profile. Moving or updating the app requires copying updated configuration for clients that reference app files; AppImage mount paths can change between launches. Remote/cloud MCP access is not supported. See the [client setup guide](https://alexanderwanyoike.github.io/auto-digger/setup/#mcp) for Claude Desktop, Claude Code and Codex. External mix pages and recording names are untrusted source material, not instructions.

## Verification and provenance

Use the [official MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) and its stdio factory pattern, independently composed with this app's Result and IPC boundaries. The installed SDK packages declare Apache-2.0; no upstream application code or assets are copied. [Electron's single-instance pattern](https://www.electronjs.org/docs/latest/api/app#apprequestsingleinstancelockadditionaldata) informs desktop ownership. The extension follows the [official MCP bundle manifest](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md), with a self-contained helper, bundled licences and no embedded connection key or Discogs token. [Electron Node mode](https://www.electronjs.org/docs/latest/api/environment-variables#electron_run_as_node) reuses the installed runtime. fflate (MIT) writes the ZIP bundle; the official MCPB manifest schema validates it in tests. The Settings TOML follows [official Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

Tests use synthetic mix/release fixtures, not a claim to have researched a real H-Foundation mix. Check storage migration and restart persistence, all-format search isolation, verified-ID additions, source opening, live picks/tags, a real SDK stdio client using the included runtime, an exported standalone Claude extension, access revocation and duplicate desktop starts. Run both full project verification commands before delivery.
