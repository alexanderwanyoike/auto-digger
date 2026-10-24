# Project site

The site lives in `site/` and builds to `site/dist/`. The separate installation and MCP guide lives at `site/setup/index.html` and publishes to `/auto-digger/setup/`. It is static HTML and CSS, with local fonts and no client JavaScript or analytics. Its dark layout introduces Discogs discovery and MCP mix research, then shows app screenshots and downloads.

```sh
yarn site:verify
yarn site:build
yarn site:preview
```

Open `http://127.0.0.1:4321/auto-digger/`. For live development use `yarn site:dev`. The project base is `/auto-digger/`; preview and deployed asset paths use that base.

## Screenshots

```sh
xvfb-run --auto-servernum yarn site:screenshots
```

The capture script opens a temporary app profile, connects a synthetic Discogs account and creates fictional releases with original cover artwork. It uses the real UI and catalogue operations. It never reads a user's library or credentials. The committed JPEGs show the digging desk, crates and appearance settings at 1440 × 1000.

The screenshots show the satin aluminium material. Font licences are retained in `site/public/licenses/`; the app icon and demo artwork are original project assets.

## GitHub Pages

The Project site workflow verifies PRs to `dev` and `main`. Pushes to `main` build and deploy through GitHub Actions. Manual runs can deploy only from `main`; PRs cannot deploy.

Configure the repository Pages source as **GitHub Actions** and limit the `github-pages` environment to `main`. Promote the feature work through `dev` and the release PR. Once it reaches `main`, the workflow publishes at:

https://alexanderwanyoike.github.io/auto-digger/

The build follows Muzo's static-site approach and GitHub's [custom Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). The page, stylesheet and assets are maintained independently for Auto Digger.

## Verification

`yarn verify` includes site content and production-build checks. They validate navigation, the MCP introduction, local assets under the Pages base and the pending-release state. Native tests check 390px and 1280px layouts, loaded images, keyboard navigation and section links. Screenshots are written to `test-results/project-site-390.png` and `test-results/project-site-1280.png`.

## Setup guide

Vite's [multi-page build pattern](https://vite.dev/guide/build#multi-page-app) includes both HTML entries and shares the existing site stylesheet. The guide adds a small stylesheet for its contents navigation and horizontally scrollable commands; it needs no client JavaScript.

MCP steps follow the app's generated JSON/TOML and the linked official client documentation. The macOS command follows Jolt's scoped `xattr -dr com.apple.quarantine` pattern, adapted to Auto Digger's installed bundle. Showbiz's broader `xattr -cr` example was checked; this guide removes only the quarantine attribute. The instructions do not run commands or change a client's configuration automatically.
