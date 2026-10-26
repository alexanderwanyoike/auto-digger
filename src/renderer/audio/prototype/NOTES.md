# Throwaway digging-desk Soulseek prototype

Question: can Soulseek be a simple alternative while digging, without asking the DJ to manage audio sources?

The user rejected the three Downloads layouts as too complex. This iteration keeps the normal digging desk and adds Use Soulseek beside each track. The comparison screens, switcher, source inspector and folder-management controls have been removed.

This is a development-only, in-memory UI study. It uses fictional release metadata and demo matches. It does not call either provider, invoke desktop download commands, create audio files or persist prototype state. Production builds exclude the prototype module and artwork. The existing release view accepts an optional track-action slot so the prototype can use the real record presentation.

## Try it

From the repository root, run:

```sh
yarn dev:web --port 5174
```

Open [the digging-desk prototype](http://127.0.0.1:5174/?prototype=audio-sources). Previous variant URLs also open this simplified flow.

1. Pick Use Soulseek beside a track. Possible public matches appear inline.
2. Choose Download on a match. The demo shows a queued state, then closes the match list and marks the track Saved from Soulseek.
3. Open Refine search only when the suggested search needs changing. Non-letter and non-number characters become spaces; accented letters and catalogue titles remain intact. Demo matches remain fixed when editing a query.
4. Expand the private-match summary if needed. Private files are labelled and cannot be downloaded. Private-only results stay distinct from an empty search.

The normal YouTube download icon remains beside the track. The demo keeps one saved copy per track and prevents accidental second downloads. No real audio is available to play. Library organisation belongs in the existing Settings flow rather than the digging desk.

For maintainer checks, append `&scenario=private-only`, `&scenario=empty` or `&scenario=offline` to the URL. These simulation controls are deliberately absent from the main interface. Reloading clears demo state.

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

## Decision to validate

Does Use Soulseek belong beside each track, or should one release-level action open the same compact list? Is the short match list enough, with query refinement and private results disclosed only on demand?

After validating the flow, implement the selected behaviour through normal application boundaries and tests. Remove the fixture release, timed demo download and development entry. The source model can retain provenance and multiple-copy support internally without making that model the main interface.
