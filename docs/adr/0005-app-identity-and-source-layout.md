# App identity and compact source layout

Status: accepted for player/source polish.

Follow Electron's [BrowserWindow icon](https://www.electronjs.org/docs/latest/api/browser-window) and [macOS Dock icon](https://www.electronjs.org/docs/latest/api/dock) APIs. Native resources live in `resources/icons`, following [electron-vite's public resource convention](https://electron-vite.org/guide/assets). Include this directory alongside `out` when packaging. Use `icon.ico` for the Windows executable, `icon.icns` for the macOS bundle and PNG sizes for Linux desktop integration. Runtime windows use ICO on Windows and PNG elsewhere, with an explicit Dock icon on macOS.

The original SVG is the master. Apache-2.0 [Sharp](https://sharp.pixelplumbing.com/) renders PNG sizes, and MIT [png2icons](https://github.com/idesis-gmbh/png2icons) produces standard ICNS and ICO containers. ICO uses the encoder's Windows executable mode: BMP for small sizes and PNG for large sizes. These development tools replace a custom encoder. No upstream artwork or implementation is copied. Generated assets are committed, and `yarn icons:check` verifies they match the source during `yarn verify` and CI.

The source list keeps the Discogs assignment and YouTube upload as separate labelled fields. The assignment controls saved metadata; it does not rename or misrepresent the original upload. Match states are short, and optional tagging detail uses the native details/summary disclosure. Existing Result boundaries and download/playback responsibilities remain unchanged.
