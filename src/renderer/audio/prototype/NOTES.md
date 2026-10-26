# Throwaway audio-source prototype

Question: can one release-track library support YouTube and Soulseek candidates, private matches and deliberate saved copies without becoming two separate libraries?

Three layouts share the existing Downloads page, selected with `?prototype=audio-sources&variant=`. This is a development-only, in-memory UI study. It does not connect to either provider, invoke desktop download commands, create music files or persist prototype state. Production builds exclude the prototype module and its switcher.

## Try it

From the repository root, run:

```sh
yarn dev:web --port 5174
```

Open [the prototype](http://127.0.0.1:5174/?prototype=audio-sources&variant=A).

- A: Track ledger, with sources and organisation beneath the library list.
- B: Source inspector, with a persistent track selector beside the source results.
- C: Release shelves, with tracks grouped by their Discogs release.

The floating arrows and left/right arrow keys cycle layouts. Text fields and selects retain their own arrow-key behaviour. The variant is stored in the URL; prototype data resets on reload.

Edit the Soulseek query and check its cleaned form. Non-letter and non-number characters become spaces, repeated spaces collapse, and accented letters remain intact. The catalogue title stays unchanged. Demo matches stay fixed when editing a query.

Use Search scenario to compare mixed public/private results, private-only results, no matches and a disconnected slskd service. Private results are visible by default with a lock label and disabled save action. Hiding them retains the private-only outcome and hidden-result count.

Choose a public candidate and advance the simulated transfer through queued, downloading, importing and complete states. Saving from another provider requires Keep another copy. Copies remain attached to one release-track row, and the preferred copy is selectable. No actual file is playable in this demo.

Change the library folder, release/flat layout and source-folder option to preview future destinations. A completed demo copy keeps the destination captured when its job was queued; changing organisation does not move it. Inspect prototype state exposes the relevant state without credentials.

## Patterns and evidence

The query work follows Nicotine+'s established distinction between original and transmitted search terms, with the user's stricter punctuation-to-space rule. No upstream implementation is copied. [Nicotine+ 3.3.11 search code](https://github.com/nicotine-plus/nicotine-plus/blob/3.3.11/pynicotine/search.py) is GPL-3.0-or-later.

slskd returns `files` and `lockedFiles` separately, along with `lockedFileCount`. Its file conversion does not populate `isLocked` in the checked release, so a future adapter must retain collection membership rather than rely on that boolean alone. A response may report a locked count without enough file details to present individual candidates; keep that as a private-results summary. See the [slskd 0.26.2 response contract](https://github.com/slskd/slskd/blob/0.26.2/src/slskd/Search/Types/Response.cs) and [file conversion](https://github.com/slskd/slskd/blob/0.26.2/src/slskd/Search/Types/File.cs). slskd is AGPL-3.0-only with additional terms; it remains an external service.

The prototype reuses Auto Digger's existing typography, theme tokens, application shell and typed Result convention. Its fixture identities are not a production catalogue migration.

## External slskd validation

A local Docker instance can validate the eventual adapter separately from this demo. Follow the [official Docker setup](https://github.com/slskd/slskd/blob/0.26.2/docs/docker.md) and [configuration guide](https://github.com/slskd/slskd/blob/0.26.2/docs/config.md).

For this session, `auto-digger-slskd` runs the official `slskd/slskd:0.26.2` image. The web UI is bound to `127.0.0.1:5030`; the peer port is TCP 50300. Only the selected collection is mounted as `/music`, read-only, and appears as Collection. Downloads and configuration live outside the repository. Soulseek automatic connection is disabled until local account setup is complete.

Local setup files:

- `~/.config/auto-digger/slskd-prototype/slskd.yml`: private service configuration.
- `~/.config/auto-digger/slskd-prototype/access.json`: private web-login details and a dedicated ReadWrite API key. Do not commit or share this file.
- `~/.local/share/auto-digger/slskd-prototype/downloads`: host-side completed downloads.

Use `docker stop auto-digger-slskd` or `docker start auto-digger-slskd` to manage this service. Enter Soulseek credentials locally in slskd; they do not belong in the prototype or this repository.

Observed on 0.26.2: the ReadWrite key can read shares, but `GET /api/v0/server` returns 403 because that controller also requires the administrator role. The web administrator can read it. A future connection check must distinguish key permissions from service reachability instead of escalating the key to administrator merely to show a status badge.

## Decision still open

Which layout wins, or which parts should be combined? Does default-visible private audio help explain coverage, or should the filter default to hidden? Does one library root with optional source folders cover actual organisation needs?

After that decision, remove the losing layouts, switcher and demo state. Implement the selected behaviour through normal application boundaries and tests. Do not promote fixture identities, simulated transfer steps or this throwaway state hook into the production download pipeline.
