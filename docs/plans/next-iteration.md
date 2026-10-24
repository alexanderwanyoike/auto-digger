# Next iteration: working plan

Status: discussion draft. The user has approved the directions below and is still finalising the plan. This document does not authorise implementation or merging new feature PRs.

## Agreed direction

- Use a local SQLite database for crates and their related catalogue information.
- Support multiple named crates as playlists of releases, with selected tracks and personal tags.
- Provide Digging desk, Crates, Downloads and Settings sections.
- Remove the PHASE 06 development badge from the interface.
- Add Discogs marketplace links for the specific pressing, and artist/title searches on Beatport, Traxsource and Bandcamp.
- Support AI mix research through MCP, saving identified releases and selected tracks into a named crate.
- Preview before downloading. Saving audio is an explicit commitment with visible progress.
- Support downloading the available tracks of an EP or album as a batch.

## Storage and crates

Migrate the existing single crate into a named crate, preserving order, cached release metadata and tracklists. Retain the original JSON as a backup, make migration repeatable without duplicates, and preserve existing audio and metadata files.

The proposed model separates releases, tracks, crates, crate entries, track picks, personal tags, downloads and research evidence. A release can appear in several crates. Picks identify the tracks of interest; tags describe them, for example warm-up, dub or vocal. These personal tags are separate from downloaded-file ID3 metadata.

Proposed default: picks and annotations belong to the crate context, so a release can have different selections in different crates. Track references should survive reopening cached metadata and should not depend only on an array index. Exact schema and migration mechanics will be designed before implementation.

Crates must accept albums, singles and compilations as well as EPs to support mix research. Removing a crate entry changes its membership; downloaded audio is managed in Downloads. SQLite holds the catalogue and library index, while audio remains in the selected filesystem location. Database and file changes need explicit recovery handling.

## Navigation

| Section      | Purpose                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| Digging desk | Filter, discover, inspect, preview and save records                           |
| Crates       | Create, name, browse and maintain playlists, picks, tags and research context |
| Downloads    | Browse everything saved, search/filter it, play audio and reveal files        |
| Settings     | Manage Discogs connection, appearance and download preferences                |

The shared bottom player remains available across sections. Downloads belong to the library independently of crate membership. A missing file should have a specific status rather than making the entire library unreadable.

## Settings

- Discogs: enter, replace, verify and forget the personal token, preserving OS-encrypted credential storage. Credentials stay outside ordinary catalogue metadata and MCP responses.
- Appearance: separate light/dark/system mode, material treatment and accent colour. Preserve readable contrast across supported combinations. The initial material and accent presets remain a design choice.
- Downloads: choose the destination with a folder picker and choose a flat layout or a folder per release. Release folders apply to EPs and albums. Retain readable filenames, the yt marker and collision protection.

Proposed default: location/layout changes apply to new downloads, while the library continues to find existing files at their recorded locations. Any relocation of existing files should be an explicit operation with a clear preview of its effect.

## Preview and saving

Preview should start progressively, before the whole source has been fetched. Proposed default: full-track, seekable playback through the bottom player. Preview uses temporary buffering or a bounded disposable cache, creates no permanent download entry and does not leave unwanted music in the chosen downloads folder.

The player needs explicit preparing, buffering, playing, paused, ended and failed states. Selecting a new source stops the previous preview. Local downloads and remote previews share transport controls, with the current source clearly indicated. Preview availability, seeking, expiring media URLs, required headers and supported audio formats need an early technical validation before the streaming approach is committed.

If streaming a source fails, show a clear error and let the user decide whether to download it. Do not silently replace preview with a permanent download. The transient cache policy and limits remain implementation decisions.

Download remains a separate action. Show queued, preparing, downloading, converting, tagging, complete, failed and cancelled states. Show bytes, speed, percentage and ETA when supplied reliably; conversion/tagging can show their stage without an invented percentage. Expose cancellation and retry, and retain successfully completed files.

Use yt-dlp's documented structured progress output rather than parsing informal console text: https://github.com/yt-dlp/yt-dlp#embedding-yt-dlp.

## Whole-release downloads

Download release should choose one source per Discogs track, respecting the user's assignments. Multiple uploads of the same track are alternatives, not automatic duplicate downloads. Show coverage and missing or ambiguous tracks before starting. Allow downloading the available selection, skip files already saved and retry failed queue items without repeating completed work.

A full-album upload is not proof of separate track files or reliable split points. Represent that source accurately. Automatic splitting or fingerprint-based identification is not included in the initial batch-download scope.

## Marketplace and search links

Discogs opens sellers for the selected release ID. Beatport, Traxsource and Bandcamp open encoded artist/title searches, with the destination clearly labelled. These links help manual discovery; a search result is not treated as a verified match automatically.

## Experimental MCP workflow

The AI host researches a mix using its available sources and Auto Digger's catalogue tools. Auto Digger exposes narrow operations to search/load releases, create/list crates, add entries, select tracks and assign personal tags. These operations use the same validated storage behaviour as the UI. The initial deployment/transport and whether the app must remain running still need a technical decision.

For H-Foundation picks, the intended result is a named crate of identified releases with the relevant tracks picked. Preserve the originating mix URL or Discogs compilation, track number/timestamp where available, supporting links and match certainty. Keep unresolved candidates distinguishable from confirmed identifications; never invent a Discogs ID or silently substitute an uncertain track/version.

MCP research should support the requested reversible catalogue edits without requiring direct AI edits to the database, credential files or audio paths. Host research capabilities and source availability determine what can be identified; MCP itself supplies the tools and context exchange.

Reference: https://modelcontextprotocol.io/docs/learn/architecture.

## Proposed delivery sequence

1. Validate progressive YouTube preview and seeking early, to resolve the central playback feasibility question.
2. SQLite migration and a first working slice of named crates, picks and personal tags.
3. Navigation, dedicated Downloads and Settings, removal of the development badge, and marketplace/search links in focused PRs.
4. Production preview, explicit download jobs/progress, destination/layout settings and whole-release queue handling.
5. Experimental MCP integration against the established crate/catalogue operations, then a complete mix-research exercise.

Use small feature branches from dev, feature PRs to dev, and a release PR from dev to main. Follow the repository's TDD, Result, validation and review instructions. Existing migration, offline, credentials and playback behaviour must remain covered. No new implementation begins while this plan is still being discussed.

## Remaining choices

- For mix research, prefer the original single/EP containing a recording, or accept reissues and compilation appearances? Preserve the exact mix/version distinction either way.
- Confirm the proposed full-track preview default and the treatment of temporary buffering.
- Choose initial materials/accents and whether the first settings release includes an explicit existing-file relocation tool.
- Confirm crate-specific annotation defaults and the initial MCP runtime/transport approach.
