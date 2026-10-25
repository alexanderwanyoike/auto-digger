# Using Auto Digger

## App updates

When the footer offers a new version, select it to download the update. A percentage shows progress. Choose **Restart to update** when it is ready. Your saved crates, account settings and music stay in place. A failed download can be retried.

On macOS, the update notice opens a new installer instead. Quit Auto Digger and install it as usual. The preview's ad-hoc signing does not support native Mac updates. Existing v0.1.1 installations need one manual upgrade to gain the updater.

If you update a Linux AppImage from 0.1.2 or 0.1.3 and the app closes without reopening, open the new 0.1.4 AppImage once from the folder where you keep Auto Digger. This refreshes its menu shortcut and starts the version with the restart fix.

## Connect Discogs

Choose **Discogs not connected** or open the connection section in Settings. Generate a personal token through the linked Discogs settings, then paste it into the app. Fields clear after submission. A successful connection is stored using operating-system encryption and restored at launch.

If the network is temporarily unavailable, use **Reconnect saved account**. If the keyring cannot unlock the token, unlock the desktop keyring or use **Forget saved token**. The app does not fall back to plaintext storage. Disconnecting removes the saved token.

## Find records

Combine label, artist, a year (`1998`) or inclusive range (`1990-1999`), title, genres, styles and release types. Each multi-select matches any selected option within that field. Leave release type empty to include all types. Style suggestions follow selected genres; changing genres clears known incompatible styles. Newer styles missing from the bundled hierarchy can be entered explicitly.

Submit **Search releases** to apply your filters. Browse sleeves, choose **Dig a random release**, then **Dig again**. Draft filter edits take effect on the next search. Reset digging starts a fresh session with the applied filters. You can also load a numeric Discogs release ID directly.

Use **Save filters** to name a filter selection. Choose it from **Saved filters** to fill the form, then search when ready. Saving with the same name updates that selection; a different name saves a new one. The trash icon removes the selected preset. Named filters and your last valid draft stay on this device after restarting.

Discogs search exposes up to the first 10,000 matching results. Narrow broad criteria to explore further. Seen release IDs and cached search pages stay in memory for the session.

## Download audio

Every attached video has its own source row. **Discogs track** names the release track; **YouTube video** names the upload. Auto Digger matches unambiguous complete titles. Correct a suggestion or choose **Keep video title** when a source covers something different. Multiple videos can map to one track.

Choose the download icon to save a source. It becomes a spinner with measured progress, then a play button when the track is saved. Preparation, conversion and tagging show a spinner until they finish. Click an active download to cancel; open Downloads to retry failures. **Download release** reviews source coverage, chooses one upload per track and lets you skip tracks. Gaps remain visible. Existing saved sources are reused.

Private, removed or restricted sources show a readable error with **Check again**. yt-dlp, FFmpeg and FFprobe must be installed and available on `PATH`; update yt-dlp if extraction stops working.

## Saved audio and the player

Files initially live in the operating system's `Music/Auto Digger` folder, with names such as `Artist - Track [release-video].yt.mp3`. Downloads use best-effort Discogs artist, album, year, genre/style and matched-track tags, plus available front-cover artwork. Missing metadata leaves usable audio with a notice. **Update tags** can correct a saved assignment offline.

The bottom bar plays downloaded audio, with play/pause, seeking and volume. Choosing another record or disconnecting Discogs keeps the current saved track playing. Use the download selector to reopen a saved track. If autoplay is blocked, press play. Use the folder button or **Show in folder** to find a track.

**Downloads** is one searchable list. Missing MP3s remain visible beside healthy tracks and offer recovery actions. Keep versioned JSON sidecars alongside the MP3s; SQLite records metadata and file locations.

## Crates and track picks

Choose an active crate before saving a release. **Crates** lets you create and rename independent playlists, reopen saved records, mark individual tracks and save comma-separated personal tags. The same release can belong to several crates with different picks and tags.

Reopening the app restores your active crate, including an intentionally empty one. Older profiles without a saved choice open a populated crate when available. Crate records, track marks and research notes live in the same local SQLite catalogue; the selected crate is a separate device preference.

## Settings

Open the cog at the right of the navigation bar. Choose Brushed aluminium, Ceramic, Slate, Graphite, Warm paper or Copper, with Blue, Teal, Amber, Coral, Sage, Lilac or Rose accents. Light, Dark and System modes are in Settings and work independently of the material.

Choose a downloads destination and flat storage or a folder per release. These choices apply to future downloads; existing files retain their recorded locations. See [download settings and recovery](features/library-settings.md).

## Backups and recovery

The catalogue is `catalog.sqlite` in Electron's `userData` directory. The encrypted token is stored separately as `discogs-token.bin`; downloaded audio stays in its chosen folders. Close Auto Digger before backing up the database and any SQLite WAL/SHM companion files. Back up audio folders with their sidecars.

Legacy `crate.json` data is validated, backed up to `crate.json.bak` and imported once. Unsupported or corrupt storage is preserved and reported. Do not delete the catalogue to recover a missing selection; check the active crate first.

For a bug report, include your operating system, app version, steps to reproduce and the readable error. Remove tokens and private file paths from screenshots. Use [GitHub Issues](https://github.com/alexanderwanyoike/auto-digger/issues).

## Linux application menu

The AppImage adds Auto Digger to your application menu when you first run it. This is a shortcut for your user account and needs no administrator access. Keep the AppImage in the folder you want to run it from. If you move it or download a new version, run that copy once to update the shortcut.

The app uses the standard XDG data directory, so it does not depend on a particular Linux distribution or desktop. It writes `applications/io.github.alexanderwanyoike.auto-digger.desktop` and `icons/io.github.alexanderwanyoike.auto-digger.png` beneath `$XDG_DATA_HOME`, or `~/.local/share` by default. Remove those two files to remove the shortcut. If that directory cannot be written, the app still opens normally from its AppImage.
