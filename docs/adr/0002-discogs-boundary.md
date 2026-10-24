# Discogs boundary

Status: accepted for Phase 2.

Use the user-token authentication and identity-verification pattern documented by the BSD-licensed [python3-discogs-client](https://github.com/joalla/discogs_client) and its [authentication guide](https://python3-discogs-client.readthedocs.io/en/latest/authentication.html). Implement only the needed HTTP calls with a named User-Agent and the Authorization header; no upstream client code is copied. Zod validates remote metadata before it crosses into the renderer.

Use [Electron's request/response IPC pattern](https://www.electronjs.org/docs/latest/tutorial/ipc) with a sandboxed CommonJS preload, a small contextBridge API and sender validation. Keep network calls and the session token in the main process. Do not expose ipcRenderer or arbitrary URLs to the renderer. The token is deliberately session-only; encrypted credential persistence and OAuth are separate future decisions.

Expected failures use the shared Result union. Busy UI controls serialize connection, lookup and disconnect actions, while main-process session revisions prevent late network completions from reviving a disconnected session. The browser-only preview offers no privileged fallback API.
