# Auto Digger

A compact desktop desk for discovering records. Electron, React and TypeScript, with brushed aluminium, blue accents and light, dark or system appearance.

Connect Discogs, combine label, artist, year, genre, style and release-title filters, then dig through random matching EPs. Download audio from attached YouTube sources, listen in the bottom player and save whole EPs in a local crate for later.

## Run

Use Node.js 22.16 or later within Node 22, and Yarn 1.22.22. Audio downloads also need current [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation), FFmpeg and FFprobe on your system PATH. Node provides yt-dlp's JavaScript runtime. Older distribution versions of yt-dlp may need updating.

```sh
yarn install --frozen-lockfile
yarn dev
```

1. Click **Discogs not connected**, open the linked Discogs settings, and generate a personal token under **Developers**.
2. Paste the token into the desktop app and choose **Connect account**.
3. Enter any combination of filters and choose **Search EPs**. Genre and style are searchable multi-selects. Releases match any selected genre and any selected style; year accepts one four-digit year. Blank filters search widely.
4. Browse sleeve cards, open a match or choose **Dig a random EP**, then **Dig again**. Draft edits take effect when you submit Search EPs. Reset digging starts fresh with the applied filters.
5. In **Audio sources**, check the suggested Discogs track for each video. Choose another track or **Keep video title** when needed, then **Download audio**. The bottom player starts the saved track. Each attached video is independently downloadable. Private, removed or restricted sources show a readable error and **Check again**.
6. Choose **Save EP to crate**. Open saved EPs from the right-hand list or remove them with the adjacent button. Saved metadata, sleeve thumbnails and video links remain available after restart without reconnecting Discogs.

You can also enter a numeric Discogs release ID to load a record directly. The crate supports EPs. Click the connected username to disconnect when finished.

After one successful connection, the app remembers your token using operating-system credential encryption and reconnects automatically on launch. Disconnect deletes the saved token. Token fields clear after submission, including unsuccessful attempts. Enter credentials in the app, not chat or project files. No YouTube API key is needed.

## Discovery and listening

Search uses Discogs' specific release and EP filters. Pagination and random digging operate within the first 10,000 matching results exposed by search. Narrow broad criteria to explore further. A digging session avoids repeated release IDs and verifies EP format against loaded metadata. This history and cached search pages stay in memory.

Auto Digger checks YouTube source availability through yt-dlp and extracts MP3 with FFmpeg. Downloads use Discogs artist, album, year, genre/style and matched track tags, plus front cover art where available. Automatic matching uses unambiguous complete track titles. You can correct a match before downloading or choose **Update tags** afterward, including while offline. Several videos can map to the same track. Missing tags or cover art leave usable audio with a notice.

Each compact source row labels the **Discogs track** separately from the **YouTube video** upload title. The suggested match can be changed; **Tagging note** expands optional metadata notices.

Files live in your operating system's **Music/Auto Digger** folder, with names such as `Artist - Track [release-video].yt.mp3`. Each has a versioned JSON sidecar holding library information. Use **Show in folder** beside a source or the folder button in the player to find it. Keep sidecars alongside their MP3s and back up the folder before manual repairs. Existing files are preserved on name collisions.

The bottom bar controls local audio with play/pause, seeking and volume. Its download selector reopens tracks after restart. Browsing another record or disconnecting Discogs keeps the current track playing. Downloading or choosing a saved track starts playback; a browser autoplay restriction shows a prompt to press play. No YouTube frame or hidden streaming player remains. Internet is needed for downloading and fetching new cover art; saved audio plays offline.

## Remembered account

The encrypted token is stored separately from the crate, in `discogs-token.bin` under Electron’s `userData` directory. The decrypted value stays in the main process and is never returned to the renderer. If the network is temporarily unavailable, **Reconnect saved account** retries the saved token. **Forget saved token** removes it even when the keyring cannot unlock it. Unlock your desktop keyring if credential storage is unavailable; the app does not use plaintext fallback storage.

## Local crate

The catalogue is `catalog.sqlite` under Electron's `userData` directory. It supports independent named crates, release membership, track picks and personal tags through isolated desktop operations. The existing single-crate screen uses the first crate until the new crate screens land. Existing `crate.json` data is validated, backed up to `crate.json.bak` and imported exactly once. Corrupt or unsupported files are preserved and reported.

Saved release metadata can be reopened while disconnected. Credentials remain separately encrypted; audio files remain in Music/Auto Digger. Close the app before backing up the SQLite database and any WAL/SHM companion files. See the [catalogue decision](docs/adr/0006-sqlite-catalogue.md).

## Build and preview

```sh
yarn build
yarn start
```

Runnable files are written to `out/`. For a renderer preview use `yarn dev:web`. The browser preview has no desktop bridge, so it cannot connect to Discogs or save a crate. Both development commands use port 5173; run one at a time.

The original app icon is in `resources/icons/icon.svg`. `yarn icons:generate` regenerates PNG sizes, Windows `icon.ico` and macOS `icon.icns`; `yarn icons:check` verifies committed exports and runs in CI. Native windows, the macOS Dock and the app header use this identity. Installer packaging must include `resources/icons` alongside `out`, use the platform icon files and register the stable app identity `io.github.alexanderwanyoike.auto-digger`. Native runtime checks run on Linux; Windows/macOS bundle and installer testing belongs to release packaging.

## Checks

```sh
yarn verify
xvfb-run --auto-servernum yarn test:electron
```

`verify` runs formatting, Airbnb-based TypeScript-aware linting, strict types, unit/integration tests and the production build. On a desktop with a display, use `yarn test:electron` directly. CI runs both commands on every PR. Tests control external HTTP and the yt-dlp executable boundary and require no live credentials. Native tests exercise actual preload/IPC, persisted crate and audio restarts, actual local playback/seek/volume, renderer isolation, blocked popups, theme persistence and compact layouts. Screenshots are saved under `test-results/`; fixtures are not bundled catalogue data.

Use `yarn format` or `yarn test:watch` while developing. EditorConfig and VS Code format-on-save settings are included.

## Project notes

See the [completed handoff and PR merge order](docs/handoff.md).

- [Domain language](CONTEXT.md)
- Phase scopes: [1](docs/phase-1.md), [2](docs/phase-2.md), [3](docs/phase-3.md), [4](docs/phase-4.md), [5](docs/phase-5.md), [6](docs/phase-6.md)
- [Downloaded audio behavior](docs/features/local-audio.md) and [upstream patterns](docs/adr/0004-downloaded-audio.md)
- [Desktop foundation](docs/adr/0001-desktop-foundation.md) and [Discogs boundary](docs/adr/0002-discogs-boundary.md)
- Review and fix records: [Phase 2](docs/reviews/phase-2.md), [Phase 3](docs/reviews/phase-3.md), [Phase 4](docs/reviews/phase-4.md), [Phase 5](docs/reviews/phase-5.md), [Phase 6](docs/reviews/phase-6.md)

The renderer remains sandboxed and isolated with no Node access. Narrow preload operations validate responses, and main-process handlers validate the sender and inputs. Fonts and icons stay local. Remote renderer images are restricted to Discogs artwork. Audio is served through a restricted local protocol; the renderer cannot pass file paths or execute commands.
