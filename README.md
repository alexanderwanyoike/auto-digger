# Auto Digger

A compact desktop desk for discovering records. Electron, React and TypeScript, with a brushed aluminium interface, blue accents and light, dark or system appearance.

## Phase 1

The app shell and visual foundation are ready. The desk has clear empty states for digging filters, the current record, a saved crate and playback. Appearance changes work and are remembered locally. If storage is unavailable, appearance still works for that session and the app explains that it cannot save the preference.

Discogs authentication, live filters, random EP discovery, YouTube playback and saved crates are later phases. Their controls are intentionally inactive in this version. No Discogs token is needed to run Phase 1.

## Run

Use Node.js 22.16 or later within Node 22, and Yarn 1.22.22.

```sh
yarn install --frozen-lockfile
yarn dev
```

For the renderer alone in a browser:

```sh
yarn dev:web
```

Both development commands use port 5173, so run one at a time.

To build and run the desktop application:

```sh
yarn build
yarn start
```

The build writes runnable application files to `out/`. Native installers and distribution are outside Phase 1.

## Checks

```sh
yarn verify
```

This checks formatting, Airbnb-based TypeScript-aware linting, strict types, React integration tests and the production build. Run the real Electron smoke test after building:

```sh
yarn test:electron
```

On headless Linux, use:

```sh
xvfb-run --auto-servernum yarn test:electron
```

CI runs both commands on every PR. The Electron test uses its own temporary profile, checks renderer isolation, blocked popups, theme persistence and layout at both 900 by 780 and 1180 by 780 pixels, and saves light and dark screenshots under `test-results/`. Playwright adds its own Chromium test launch switches; the production window explicitly enables sandboxing and context isolation and disables Node integration.

Use `yarn format` to format the project or `yarn test:watch` while developing. EditorConfig and VS Code format-on-save settings are included; install the recommended Prettier and ESLint extensions to enable editor formatting.

## Project notes

- [Phase 1 scope](docs/phase-1.md)
- [Domain language](CONTEXT.md)
- [Architecture and open-source patterns](docs/adr/0001-desktop-foundation.md)

The renderer has no preload or IPC bridge because Phase 1 needs no privileged operations. The build's missing-preload notice is expected. No remote content is loaded by the shell; fonts, icons and the record illustration are local assets.
