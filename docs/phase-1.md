# Phase 1: app shell and visual foundation

## Scope

A runnable Electron desktop shell with React and strict TypeScript. A restrained brushed aluminium interface has blue accents, light and dark modes, and an operating-system theme option. The digging desk reserves space for filters, the current record, a saved crate and YouTube playback. Future features are labelled and inactive; no fabricated releases or connection status are shown.

Use Yarn for all package operations. Provide formatting, Airbnb-based TypeScript-aware linting, unit/integration tests, and CI enforcement from the outset.

## Acceptance behaviours

- Opening the app shows the digging desk and clear disconnected and empty states.
- Light and dark theme choices update the interface; the system option follows operating-system changes.
- The selected appearance survives reloads; unavailable browser storage produces a deliberate, nonfatal result.
- The desktop window starts with context isolation, sandboxing and Node integration disabled in the renderer, and blocks unsolicited navigation and windows.
- The built desktop app can open and switch themes in an automated Electron smoke test.

## Later phases

2. Discogs token and release metadata.
3. Combined digging filters.
4. Random matching EPs and session history.
5. YouTube playback.
6. A persistent local crate.
