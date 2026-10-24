# Releases

Feature branches start from `dev` and target `dev`. Use merge commits. Promote the completed work through a `dev` to `main` release PR.

Before the first release, merge the aluminium, project-site and installer work in their documented dependency order. Run `yarn verify` and `xvfb-run --auto-servernum yarn test:electron` on the combined code. Check a real Discogs account, preview/download flow and MCP research session with a configured host.

The app version is in `package.json`. A release tag must match that version and identify a commit on `main`. Keep existing tags immutable. Publishing the release and creating its tag are separate actions from merging a feature PR.

## Native distribution

The first release is intended to include a Windows x64 installer, macOS disk images for Apple silicon and Intel, and a Linux x64 AppImage. Installer configuration and CI validation are being prepared separately from the site.

The desktop needs current yt-dlp, FFmpeg, FFprobe and Node.js on PATH for audio extraction. The app does not bundle those tools. External MCP clients need Node.js 22 or newer and a running app session with research access enabled.

## Site publication

The Pages workflow publishes from `main`. Before installers are published, the site displays their pending status. See [project-site setup](project-site.md).

The project uses the MIT licence. Preserve bundled dependency and font licences in distributed packages.
