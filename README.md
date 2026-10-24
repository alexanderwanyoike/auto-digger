<div align="center">
  <img src="resources/icons/icon-128.png" alt="" width="72" height="72" />
  <h1>Auto Digger</h1>
  <p>Discogs discovery and MCP mix research.</p>
  <p>
    <a href="https://alexanderwanyoike.github.io/auto-digger/">Project site</a> ·
    <a href="#quick-start">Quick start</a> ·
    <a href="docs/user-guide.md">User guide</a> ·
    <a href="https://github.com/alexanderwanyoike/auto-digger/issues">Feedback</a>
  </p>
</div>

![Auto Digger's digging desk in satin aluminium dark, with a fictional record and a populated crate](site/public/images/digging-desk.jpg)

_The real desktop app, shown with fictional records and original demo artwork._

Auto Digger is a desktop app for discovering records on Discogs. Connect an MCP client to research mixes and save the original releases to named crates, with matching tracks, tags and source notes. You can also browse releases, preview audio and keep downloaded tracks in a local library.

## Status

Auto Digger is a desktop preview. The first release is being prepared, and the app can be run from source today. Native installers have not been published. Release notes and downloads belong on [GitHub Releases](https://github.com/alexanderwanyoike/auto-digger/releases).

The project site publishes from `main` after its Pages workflow is merged. Installer CI builds Windows x64, macOS Apple silicon and Intel, and Linux x64 packages. PR artifacts are available for testing. Windows builds are unsigned; macOS builds are ad-hoc signed and not notarized. Interactive Windows and macOS testing remains necessary. The experimental MCP workflow is covered by automated tests with synthetic sources; real mix research through a configured AI host still needs a manual check.

## What you can do

| Feature          | Details                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| MCP mix research | Let an AI host research a mix, look up Discogs releases and add them to a crate with picked tracks, tags and source notes.       |
| Discovery        | Combine label, artist, year and title with multi-select genres, styles and release types. Browse artwork or draw random matches. |
| Audio            | Preview YouTube sources before downloading. Save tracks or whole releases with progress, retry and best-effort Discogs metadata. |
| Crates           | Keep named collections of releases with track picks and personal tags. The active crate returns after restart.                   |
| Downloads        | Search saved tracks, play them locally and open their folders. Choose flat or per-release file organisation.                     |
| Appearance       | Six materials, seven accents and light, dark or system appearance.                                                               |

## Quick start

### Requirements

- **Node.js 22.16 or later within Node 22**, and **Yarn 1.22.22**.
- A **Discogs personal token** for discovery. The app links to the token settings when you connect.
- Current **[yt-dlp](https://github.com/yt-dlp/yt-dlp#installation)**, **[FFmpeg and FFprobe](https://ffmpeg.org/download.html)** on your `PATH` for previews and audio downloads. Node supplies yt-dlp's JavaScript runtime.
- A desktop session with Electron's system libraries. Headless Linux checks also need Xvfb.

```sh
git clone https://github.com/alexanderwanyoike/auto-digger.git
cd auto-digger
yarn install --frozen-lockfile
yarn dev
```

1. Choose **Discogs not connected**, generate a personal token using the linked settings, and connect in the app.
2. Set your filters and choose **Search releases**, then browse a sleeve or **Dig a random release**.
3. Open a record, check its source-to-track assignments and choose **Preview**. Download the tracks you want to keep.
4. Choose a crate and save the release. Open **Crates** to mark tracks and add tags; use **Downloads** for saved audio.

The token is remembered using operating-system encryption. Disconnecting deletes the saved token. Enter credentials in the app, never in issues, screenshots or project files. No YouTube API key is needed.

See the [user guide](docs/user-guide.md) for source matching, whole-release downloads, account recovery and storage details.

## Your data stays on your desktop

| Data                                                                    | Storage                                                                                   |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Crates, releases, picks, tags, research notes, settings and audio index | `catalog.sqlite` in Electron's `userData` directory                                       |
| Discogs credential                                                      | Separately encrypted `discogs-token.bin` in `userData`                                    |
| Downloaded audio                                                        | Initially `Music/Auto Digger`; future destination and layout are configurable in Settings |
| Audio recovery metadata                                                 | A versioned JSON sidecar beside each downloaded MP3                                       |
| Active crate and appearance mode                                        | Device UI preferences                                                                     |

Saved record metadata and downloaded audio work offline. New Discogs lookups, artwork retrieval and previews need the internet. Close the app before backing up the catalogue and its WAL/SHM companion files; keep audio recovery sidecars with their tracks. Existing `crate.json` data is validated, backed up and imported once.

Auto Digger does not provide cloud sync. The renderer is sandboxed, credentials stay in the main process, and desktop operations use narrow validated IPC boundaries. See [SQLite catalogue ownership](docs/adr/0006-sqlite-catalogue.md) and [account storage](docs/adr/0003-remembered-discogs-account.md).

## Experimental mix research

In **Settings → AI mix research**, enable access and copy the provided configuration into a compatible MCP client. The app must stay open, the client needs Node.js 22 or newer, and Discogs searches need a connected account.

> Research this mix. Find the original releases, put them in an After hours crate and mark the tracks. Keep the sources and flag anything uncertain.

The AI host performs source research and recording-match judgement. Auto Digger supplies verified Discogs and catalogue operations. It does not identify a whole mix automatically. Evidence and unresolved candidates appear beside the saved records. Access starts disabled on every restart and can be revoked in Settings.

See [mix research setup and tools](docs/features/mix-research.md).

## Development

The app uses Electron, React, strict TypeScript and SQLite. Yarn is the package manager.

| Command                                           | Purpose                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `yarn dev`                                        | Run the desktop app with live development updates                        |
| `yarn build` / `yarn start`                       | Build and open the production desktop bundle                             |
| `yarn verify`                                     | Check icons, formatting, lint, strict types, tests and production builds |
| `xvfb-run --auto-servernum yarn test:electron`    | Run native Electron checks on headless Linux                             |
| `yarn site:verify` / `yarn site:build`            | Verify and build the GitHub Pages site                                   |
| `yarn site:dev` / `yarn site:preview`             | Develop or preview the site at `/auto-digger/`                           |
| `xvfb-run --auto-servernum yarn site:screenshots` | Capture the real app using an isolated fictional collection              |
| `yarn format`                                     | Format maintained code and documentation                                 |

`yarn dev:web` offers a renderer-only preview. It has no desktop bridge, so it cannot connect to Discogs or save crates. The app bundle is written to `out/`; the static site is written to `site/dist/`.

```text
src/main/       Desktop services, SQLite, credentials and downloads
src/preload/    Validated desktop bridge
src/renderer/   React desk, player and library sections
src/shared/     Domain types, schemas and typed Results
src/mcp/        Local MCP client entry point
site/          Static project site, screenshots and font licences
tests/         Unit/integration fixtures, site checks and native tests
docs/          User guides, architecture decisions and feature specifications
```

Tests use controlled external-service fixtures and isolated profiles, without live credentials or user libraries. Native checks cover playback, downloads, restarts, storage migration, research revocation, keyboard use, layout and appearance contrast.

## Contributing

Start a focused feature branch from `dev` and open its PR against `dev`. Promote `dev` to `main` through a release PR. Use merge commits; squash merging is disabled. Follow the [repository instructions](AGENTS.md), including test-first changes with separate test and implementation commits.

Useful starting points: [domain language](CONTEXT.md), [architecture decisions](docs/adr/), [site publication](docs/project-site.md), and [release preparation](docs/releasing.md).

## Licence and credits

Auto Digger is [MIT licensed](LICENSE). Copyright © 2026 Alexander Wanyoike.

Built on [Discogs](https://www.discogs.com/developers), [yt-dlp](https://github.com/yt-dlp/yt-dlp), [FFmpeg](https://ffmpeg.org/), [Electron](https://www.electronjs.org/), [React](https://react.dev/) and the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk). Manrope and IBM Plex Mono are distributed under their retained [font licences](site/public/licenses/). Auto Digger is an independent project and is not affiliated with Discogs or YouTube.
