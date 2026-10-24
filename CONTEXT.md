# Auto Digger

Auto Digger is a desktop music discovery tool. A digging session finds random EPs from Discogs releases matching optional label, year, genre, style, artist and release-title filters. Discogs calls subgenres styles. Genres and styles are searchable multi-selects: match any selected value within each field and combine the fields with AND. The bundled Discogs taxonomy includes every listed option and accepts new names. Applied filters are distinct from draft edits.

A release is a specific Discogs pressing, identified by release ID. An EP is the initial supported format. Digging avoids repeating release IDs within a session, verifies EP format and stays within Discogs' accessible search window. Changing applied criteria, explicitly resetting or reconnecting starts fresh.

A crate is a named local playlist of whole releases, distinct from a Discogs collection or wantlist. Each crate preserves insertion order and unique release IDs. Track picks and personal tags belong to that crate membership. Shared Discogs metadata stays separate. The main process persists the catalogue in SQLite and imports the original JSON crate once with a backup. Saved metadata and YouTube links can be reopened after restart without connecting Discogs. It does not store credentials or audio.

Each video attached to a release is a distinct audio source. Several sources can map to one Discogs track. Automatic matching uses unambiguous complete titles; the user can correct assignments or keep the video title. yt-dlp and FFmpeg extract MP3, with best effort Discogs ID3 and artwork. Saved sources are keyed by release/video pair, live in Music/Auto Digger and can be corrected offline without redownloading. The bottom player controls local audio, persists independently of browsing or Discogs connection and can reopen downloaded tracks after restart. No embedded YouTube playback remains.

A connected account means Discogs verified a personal token for the current app session. Decrypted tokens stay in main-process memory; an OS-encrypted credential is remembered on this device and verified again on launch. Disconnect forgets that credential and clears the account, loaded record, search results and digging history, while the saved crate persists.

Phases 1 through 6 cover desktop foundation, connection/metadata, filtered search, random discovery, YouTube playback and local crate persistence. Installer packaging, cloud sync and export are outside this prototype. Named-crate desktop operations are available; the dedicated screens are the next UI phase.
