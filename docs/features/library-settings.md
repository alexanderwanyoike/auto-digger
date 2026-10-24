# Library settings and indexed audio

Settings manages the existing OS-encrypted Discogs connection, independent light/dark/system mode, aluminium/ceramic/slate materials and blue/teal/amber accents. Mode retains the existing local appearance preference. Materials, accent and download choices are validated and saved in SQLite. No credential enters the preferences or download index.

Choose the destination through the native folder picker. Cancellation preserves the existing choice and unwritable folders produce an explicit error. The renderer cannot submit an arbitrary directory through Save. Choose a flat directory or a folder per release named with sanitized artist/title and the exact Discogs release ID. Filenames retain the `.yt.mp3` marker and exclusive collision protection.

Location/layout changes apply to future tracks. Existing tracks remain at their recorded locations. The SQLite v2 upgrade adds download directories and metadata, preserving crate data. On first library read, import the original Music/Auto Digger sidecars. Record each destination before publishing audio so an interrupted index update can recover from its sidecar on the next scan. Sidecars remain recovery metadata alongside MP3s, while SQLite is the library index. No automatic file relocation is performed.

Missing MP3s stay in the library as individually unavailable rows. Other tracks continue to play. Playable tracks use validated indexed paths in the main process; the renderer receives opaque protocol IDs. Revealing a missing track uses its recorded location. Deleting crates never removes audio. Corrupt metadata produces an explicit preservation error.

This extends the existing SQLite prepared-statement/transaction and yt-dlp staged-publication patterns. Refer to ADRs 0004 and 0006 and their upstream sources. No upstream source is copied and no dependency is added.

Dependencies: PRs #15, #16 and #17. This feature branch starts from dev, integrates the reviewed prerequisites locally and targets dev. New PRs remain unmerged pending explicit approval.
