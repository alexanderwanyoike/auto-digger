# Releases

Feature branches start from `dev` and target `dev`. Use merge commits. Promote completed work through a `dev` to `main` release PR.

Merge the aluminium, project-site and installer PRs in that order. Run `yarn verify`, `xvfb-run --auto-servernum yarn test:electron` and `xvfb-run --auto-servernum yarn package:test` on the combined code. Check a real Discogs account, preview/download flow and an MCP session with your client before publishing.

## Installers

`yarn package:make` builds an installer for the current platform. Use `--linux --x64`, `--win --x64`, `--mac --arm64` or `--mac --x64` on a compatible build host. `yarn package:dir` creates an unpacked app. Outputs are in `release/`.

The Desktop installers workflow builds Windows x64 NSIS, Apple silicon and Intel DMGs, and a Linux x64 AppImage. PR runs provide downloadable artifacts for testing. CI installs the Windows executable, mounts and checks both DMGs, and opens the extracted AppImage with a real MCP client. It checks the app, renderer, preload, MCP entry, icon and licence files in each payload. Windows and macOS interactive playback still need testing on those systems.

Windows builds are unsigned. macOS builds are ad-hoc signed and not notarized. These preview installers may trigger operating-system checks. Signing with a publisher certificate and notarization need separate release credentials.

The desktop requires current yt-dlp, FFmpeg, FFprobe and Node.js on PATH for audio extraction. Those tools are not bundled. External MCP clients need Node.js 22 or newer and a running app with research access enabled.

## Draft and publication

The version in `package.json` must match an annotated `vX.Y.Z` tag on a commit reachable from `main`. After the release PR is merged and publication is approved, create and push that tag. The workflow rejects mismatched versions, lightweight tags and commits outside `main`.

All four builds must pass before CI assembles the installers and `SHA256SUMS`. A tag run creates a draft GitHub release. It does not publish the draft or replace an existing release. Download the artifacts, verify the checksums and complete platform testing before publishing.

## Site

Pages deploys from `main`. Before a stable release exists, the site shows disabled installer controls. Once a stable release is published, CI rebuilds Pages from `main` and injects links only after validating all four installer assets and `SHA256SUMS`. A partial or malformed release fails the build, preserving the previous site.

For a local published-state preview, save the GitHub release API response and run `AUTO_DIGGER_RELEASE_JSON=/absolute/path/release.json yarn site:build`. The normal local build stays in the pending state. See [site setup](project-site.md).

## Packaging pattern and licences

The packaging follows electron-builder's native targets and the existing Muzo distribution workflow. Auto Digger uses ordinary resource files (`asar: false`) because its MCP entry runs in an external Node process, which cannot load an Electron ASAR archive. Runtime dependencies and their licences remain alongside the compiled app. Font licences are included explicitly.

References: [electron-vite distribution](https://electron-vite.org/guide/distribution), [electron-builder configuration](https://www.electron.build/configuration/) and [Vite HTML transforms](https://vite.dev/guide/api-plugin#transformindexhtml). The project uses MIT; preserve bundled third-party licences.
