# Auto Digger

Auto Digger is a desktop music discovery tool. A digging session will use Discogs metadata to find random EPs matching label, year, genre, style, artist, and optionally release title. Discogs calls subgenres styles.

A release is a specific Discogs release. An EP is the initial supported format. A crate is a saved playlist of releases for later listening, distinct from a Discogs collection or wantlist. Playback will use YouTube videos associated with a release.

Phase 1 provides the desktop shell, theme controls and honest empty states. Phase 2 adds a session-only Discogs account connection and loading release metadata by numeric ID. Search filters, random discovery, playback and saved crates remain later phases. A connected account means Discogs has verified the personal token for the current application session.
