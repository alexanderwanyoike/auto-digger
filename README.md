# Auto Digger

A compact desktop desk for discovering records. Electron, React and TypeScript, with brushed aluminium, blue accents and light, dark or system appearance.

Connect Discogs, combine label, artist, year, genre, style and release-title filters, then dig through random matching releases. Download audio from attached YouTube sources, listen in the bottom player and save releases into named crates with track picks and personal tags.

## Run

Use Node.js 22.16 or later within Node 22, and Yarn 1.22.22. Audio downloads also need current [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation), FFmpeg and FFprobe on your system PATH. Node provides yt-dlp's JavaScript runtime. Older distribution versions of yt-dlp may need updating.

```sh
yarn install --frozen-lockfile
yarn dev
```

1. Click **Discogs not connected**, open the linked Discogs settings, and generate a personal token under **Developers**.
2. Paste the token into the desktop app and choose **Connect account**.
3. Enter any combination of filters and choose **Search releases**. Release type, genre and style are searchable multi-selects. Releases match any selection within each field; year accepts one four-digit year. Style suggestions follow the selected genres; changing genres removes known incompatible style selections. Clear all genres to browse the full style list. Newer styles absent from the bundled hierarchy can be entered explicitly. Leave release type empty to include all types. Blank filters search widely.
4. Browse sleeve cards, open a match or choose **Dig a random release**, then **Dig again**. Draft edits take effect when you submit Search releases. Reset digging starts fresh with the applied filters.
5. In **Audio sources**, check the suggested Discogs track for each video. Choose another track or **Keep video title** when needed, then **Preview** to listen without saving. Choose **Download audio** to keep it. The bottom player switches to the saved track after download. Each attached video is independently downloadable. Download actions enter the shared queue, showing measured progress, conversion and tagging stages. Cancel or retry from the record or Downloads. Use **Download release** to review source coverage, choose one upload per track, skip tracks and save the available selection. Existing saved sources are reused. Private, removed or restricted sources show a readable error and **Check again**.
6. Choose an active crate and save the release. In **Crates**, create or rename playlists, choose track picks and save comma-separated personal tags. Saved metadata, artwork references and video links remain available after restart without reconnecting Discogs. **Downloads** is one searchable track list with artist/release columns, play and folder actions. Current download progress and retry controls appear inline; completed history does not duplicate saved tracks. **Settings** manages your Discogs connection and appearance.

You can also enter a numeric Discogs release ID to load a record directly. Crates accept EPs, albums and other releases. Reopening the app restores your selected crate. Older profiles without a saved choice open a populated crate when available. Click the connected username to disconnect when finished.

After one successful connection, the app remembers your token using operating-system credential encryption and reconnects automatically on launch. Disconnect deletes the saved token. Token fields clear after submission, including unsuccessful attempts. Enter credentials in the app, not chat or project files. No YouTube API key is needed.

## Discovery and listening

Search uses Discogs' specific release search and optional format descriptions for release types. Pagination and random digging operate within the first 10,000 matching results exposed by search. Narrow broad criteria to explore further. A digging session avoids repeated release IDs and checks loaded metadata against any selected release type. This history and cached search pages stay in memory.

Auto Digger checks YouTube source availability through yt-dlp and extracts MP3 with FFmpeg. Downloads use Discogs artist, album, year, genre/style and matched track tags, plus front cover art where available. Automatic matching uses unambiguous complete track titles. You can correct a match before downloading or choose **Update tags** afterward, including while offline. Several videos can map to the same track. Missing tags or cover art leave usable audio with a notice.

Each compact source row labels the **Discogs track** separately from the **YouTube video** upload title. The suggested match can be changed; **Tagging note** expands optional metadata notices.

Files initially live in your operating system's **Music/Auto Digger** folder, with names such as `Artist - Track [release-video].yt.mp3`. Each has a versioned JSON recovery sidecar; SQLite indexes its metadata and recorded location. Use **Show in folder** beside a source or the folder button in the player to find it. Keep sidecars alongside their MP3s and back up the folder before manual repairs. Existing files are preserved on name collisions.

The bottom bar controls local audio with play/pause, seeking and volume. Its download selector reopens tracks after restart. Browsing another record or disconnecting Discogs keeps the current track playing. Downloading or choosing a saved track starts playback; a browser autoplay restriction shows a prompt to press play. Use **Preview** to stream a source through the bottom player before committing to a download. Preview shows preparing/buffering states and can be stopped; it creates no saved file or library entry. No YouTube frame remains. Internet is needed for downloading and fetching new cover art; saved audio plays offline.

## Settings

Open the cog at the right of the navigation bar. Choose aluminium, ceramic or slate material and blue, teal or amber accents independently of light/dark/system mode. Use the native folder picker to choose a downloads destination and choose flat storage or a folder per release. These choices apply to future downloads; existing files stay at their recorded locations. Unavailable MP3s remain individual library rows while healthy tracks still play. See [library settings and recovery](docs/features/library-settings.md).

## Remembered account

The encrypted token is stored separately from the crate, in `discogs-token.bin` under Electron’s `userData` directory. The decrypted value stays in the main process and is never returned to the renderer. If the network is temporarily unavailable, **Reconnect saved account** retries the saved token. **Forget saved token** removes it even when the keyring cannot unlock it. Unlock your desktop keyring if credential storage is unavailable; the app does not use plaintext fallback storage.

## Local crate

The catalogue is `catalog.sqlite` under Electron's `userData` directory. It supports independent named crates, release membership, track picks and personal tags through isolated desktop operations. The desk selector chooses where to save; the Crates section manages playlists, track picks and personal tags. Existing `crate.json` data is validated, backed up to `crate.json.bak` and imported exactly once. Corrupt or unsupported files are preserved and reported.

Saved release metadata can be reopened while disconnected. Credentials remain separately encrypted; audio files stay in their recorded directories. Close the app before backing up the SQLite database and any WAL/SHM companion files. See the [catalogue decision](docs/adr/0006-sqlite-catalogue.md).

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

## Experimental mix research

Build with `yarn build`, start the app and open Settings using the cog. Enable **AI mix research** and copy the displayed MCP configuration into your local client. Choose JSON configuration for a compatible desktop host, or Codex TOML for the [documented `mcp_servers` configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). Node.js 22 or newer must be available on that client's PATH. The app must stay open; searches also require a connected Discogs account. Copy the configuration again if the app folder moves.

Then ask the host to research a specific mix, verify its tracklist and versions, create a named crate, add the original single/EP releases where possible, pick the matching tracks and retain source links, timestamps and unresolved candidates. The host needs its own web/source research capabilities. Auto Digger supplies catalogue and Discogs tools; it does not identify an entire mix automatically.

Crates displays the host's evidence and uncertainty alongside the saved records. Picks, tags and source notes persist in SQLite. Disable research access or close the app to revoke client access. Access starts disabled after every restart. No client configuration is installed automatically, and the displayed configuration contains no Discogs token. See [the feature specification](docs/features/mix-research.md) for the tool set, local boundary and prototype limits.

The Appearance section uses live material thumbnails, a Light/Dark/System selector and seven accent swatches. Materials include Brushed aluminium, Ceramic, Slate, Graphite, Warm paper and Copper. Choose Blue, Teal, Amber, Coral, Sage, Lilac or Rose; settings persist alongside the existing download options.
