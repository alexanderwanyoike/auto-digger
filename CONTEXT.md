# Auto Digger

Auto Digger is a desktop music discovery tool. A digging session finds random EPs from Discogs releases matching optional label, year, genre, style, artist and release-title filters. Discogs calls subgenres styles. Genres and styles are searchable multi-selects: match any selected value within each field and combine the fields with AND. The bundled Discogs taxonomy includes every listed option and accepts new names. Applied filters are distinct from draft edits.

A release is a specific Discogs pressing, identified by release ID. An EP is the initial supported format. Digging avoids repeating release IDs within a session, verifies EP format and stays within Discogs' accessible search window. Changing applied criteria, explicitly resetting or reconnecting starts fresh.

A crate is a local saved playlist of whole EP releases, distinct from a Discogs collection or wantlist. It preserves insertion order and unique release IDs. Saved metadata and YouTube links can be reopened after restart without connecting Discogs. It does not store credentials or audio.

Playback uses visible official YouTube players for videos associated with a release. It requires internet and video availability. Selection does not autoplay; hidden players pause and replaced players are destroyed.

A connected account means Discogs verified a personal token for the current app session. Decrypted tokens stay in main-process memory; an OS-encrypted credential is remembered on this device and verified again on launch. Disconnect forgets that credential and clears the account, loaded record, search results and digging history, while the saved crate persists.

Phases 1 through 6 cover desktop foundation, connection/metadata, filtered search, random discovery, YouTube playback and local crate persistence. Installer packaging, cloud sync, named crates and export are outside this prototype.
