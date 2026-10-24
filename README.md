# Auto Digger

A compact desktop desk for discovering records. Electron, React and TypeScript, with brushed aluminium, blue accents and light, dark or system appearance.

Connect Discogs, combine label, artist, year, genre, style and release-title filters, then dig through random matching EPs. Listen through a visible official YouTube player and save whole EPs in a local crate for later.

## Run

Use Node.js 22.16 or later within Node 22, and Yarn 1.22.22.

```sh
yarn install --frozen-lockfile
yarn dev
```

1. Click **Discogs not connected**, open the linked Discogs settings, and generate a personal token under **Developers**.
2. Paste the token into the desktop app and choose **Connect account**.
3. Enter any combination of filters and choose **Search EPs**. Genre and style accept Discogs' full vocabulary; year accepts one four-digit year. Blank filters search widely.
4. Open a match or choose **Dig a random EP**, then **Dig again**. Draft edits take effect when you submit Search EPs. Reset digging starts fresh with the applied filters.
5. Choose an attached YouTube video and press its official play control. Some records have no video, and some videos are unavailable or prohibit embedding. Retry or select another attached video when needed.
6. Choose **Save EP to crate**. Open saved EPs from the right-hand list or remove them with the adjacent button. Saved metadata and video links remain available after restart without reconnecting Discogs.

You can also enter a numeric Discogs release ID to load a record directly. The crate supports EPs. Click the connected username to disconnect when finished.

Tokens stay only in main-process memory and are cleared on disconnect or exit. Token fields clear after submission, including unsuccessful attempts. Enter credentials in the app, not chat or project files. No YouTube API key is needed.

## Discovery and listening

Search uses Discogs' specific release and EP filters. Pagination and random digging operate within the first 10,000 matching results exposed by search. Narrow broad criteria to explore further. A digging session avoids repeated release IDs and verifies EP format against loaded metadata. This history and cached search pages stay in memory.

YouTube uses its visible official player, including seek and volume controls. Selection does not autoplay. Playback pauses when the player leaves view or the app is hidden, and stops when the release is replaced. It requires internet and an available video. Auto Digger does not download or extract audio.

## Local crate

The crate is a versioned `crate.json` file in Electron's `userData` directory. It stores validated release metadata and attached video links, never credentials. Saves prevent duplicate release IDs and preserve insertion order. Writes are serialized and replace the file atomically. Read/write errors are shown explicitly; a corrupt or unsupported file is preserved instead of silently replaced. Back up this file before manual repairs.

Saved metadata can be reopened while disconnected. Artwork and YouTube still need internet. Cloud sync, named crates, export and native installers are outside this prototype.

## Build and preview

```sh
yarn build
yarn start
```

Runnable files are written to `out/`. For a renderer preview use `yarn dev:web`. The browser preview has no desktop bridge, so it cannot connect to Discogs or save a crate. Both development commands use port 5173; run one at a time.

Before distribution, installer packaging must register the stable app identity `io.github.alexanderwanyoike.auto-digger`, also used to identify desktop YouTube embeds.

## Checks

```sh
yarn verify
xvfb-run --auto-servernum yarn test:electron
```

`verify` runs formatting, Airbnb-based TypeScript-aware linting, strict types, unit/integration tests and the production build. On a desktop with a display, use `yarn test:electron` directly. CI runs both commands on every PR. Tests control external HTTP and YouTube API boundaries and require no live credentials. Native tests exercise actual preload/IPC, persisted crate restarts, renderer isolation, blocked popups, theme persistence and compact layouts. Screenshots are saved under `test-results/`; fixtures are not bundled catalogue data.

Use `yarn format` or `yarn test:watch` while developing. EditorConfig and VS Code format-on-save settings are included.

## Project notes

See the [completed handoff and PR merge order](docs/handoff.md).

- [Domain language](CONTEXT.md)
- Phase scopes: [1](docs/phase-1.md), [2](docs/phase-2.md), [3](docs/phase-3.md), [4](docs/phase-4.md), [5](docs/phase-5.md), [6](docs/phase-6.md)
- [Desktop foundation](docs/adr/0001-desktop-foundation.md) and [Discogs boundary](docs/adr/0002-discogs-boundary.md)
- Review and fix records: [Phase 2](docs/reviews/phase-2.md), [Phase 3](docs/reviews/phase-3.md), [Phase 4](docs/reviews/phase-4.md), [Phase 5](docs/reviews/phase-5.md), [Phase 6](docs/reviews/phase-6.md)

The renderer remains sandboxed and isolated with no Node access. Narrow preload operations validate responses, and main-process handlers validate the sender and inputs. Fonts and icons stay local. Parent-page remote resources are scoped to Discogs artwork and the official YouTube embed.
