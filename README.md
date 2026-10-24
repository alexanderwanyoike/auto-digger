# Auto Digger

A compact desktop desk for discovering records. Electron, React and TypeScript, with a brushed aluminium interface, blue accents and light, dark or system appearance.

## Phase 2

Connect a Discogs account with a personal token and load a release by its numeric ID. The desk shows artwork, artists, labels, catalogue numbers, year, country, genres, styles, formats, tracklist and the number of attached YouTube videos. Missing metadata and unavailable artwork get clear fallbacks.

Tokens are verified with Discogs, kept only in main-process memory and cleared on disconnect or app exit. The app does not save credentials. Submitted token fields are cleared even when authentication fails. Network, authentication, rate-limit, missing-release and invalid-response failures are handled explicitly.

Live digging filters, random EP discovery, YouTube playback and saved crates remain later phases. Their controls are inactive in this version.

## Run

Use Node.js 22.16 or later within Node 22, and Yarn 1.22.22.

```sh
yarn install --frozen-lockfile
yarn dev
```

1. Click **Discogs not connected** in the header.
2. Open Discogs settings from the connection dialog, then generate a personal token under **Developers**.
3. Paste the token into the desktop app and choose **Connect account**.
4. Enter a numeric Discogs release ID and choose **Load release**. The ID is the number after `/release/` in a Discogs release URL.
5. Click the connected username to disconnect when finished.

Enter credentials in the app, not in chat or project files. No API keys or environment variables are needed to start the app; a personal token is needed only for the connection flow.

For the renderer alone in a browser:

```sh
yarn dev:web
```

The browser preview cannot connect to Discogs because it has no desktop bridge. Both development commands use port 5173, so run one at a time.

To build and run the desktop application:

```sh
yarn build
yarn start
```

The build writes runnable application files to `out/`. Native installers and distribution are outside the current scope.

## Checks

```sh
yarn verify
```

This checks formatting, Airbnb-based TypeScript-aware linting, strict types, React and API integration tests, and the production build. Run the real Electron smoke tests after building:

```sh
yarn test:electron
```

On headless Linux, use:

```sh
xvfb-run --auto-servernum yarn test:electron
```

CI runs both commands on every PR. Tests replace external HTTP responses and need no live token. The Electron tests use temporary profiles, exercise the real preload and IPC path, and check connection, lookup, disconnect, renderer isolation, blocked popups, theme persistence and compact layouts. Light/dark screenshots are saved under `test-results/`. Their records and artwork are test fixtures, not bundled catalogue data.

Use `yarn format` to format the project or `yarn test:watch` while developing. EditorConfig and VS Code format-on-save settings are included; install the recommended Prettier and ESLint extensions to enable editor formatting.

## Project notes

- [Phase 1 scope](docs/phase-1.md)
- [Phase 2 scope](docs/phase-2.md)
- [Domain language](CONTEXT.md)
- [Desktop foundation](docs/adr/0001-desktop-foundation.md)
- [Discogs boundary and upstream patterns](docs/adr/0002-discogs-boundary.md)

The renderer stays sandboxed and isolated, with no Node access. Its narrow preload bridge validates responses and exposes only the specific Discogs operations needed by this phase. Main-process handlers validate the sender and inputs. Remote artwork is limited to Discogs image hosts; fonts and icons remain local.
