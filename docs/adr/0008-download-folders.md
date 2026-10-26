# Configurable download folders

Status: accepted for production folder organisation.

Keep the default Music/Auto Digger destination and the existing flat and per-release choices. A custom layout is an ordered, unique selection of source, genre, year, label, artist and release folder levels. An empty selection means the destination root. Source names are YouTube and Soulseek. Use the first Discogs genre and label, with explicit Unknown fallbacks for missing metadata. Release folders retain the Discogs release ID to distinguish pressings.

Settings provides ordering, removal and an illustrative path preview. Persist the selection with the existing validated SQLite preferences snapshot. Older preferences omit the optional folder levels and retain their old layout. Appearance changes must preserve folder choices.

Continue the application's existing filename sanitisation and indexed-library destination pattern. Resolve every segment beneath the selected destination; metadata cannot introduce separators or traversal. Source-specific adapters supply the source name rather than managing paths themselves. No new package or copied implementation is needed.

Apply changes only to future downloads. Existing files stay at their recorded locations and remain playable after restart. Downloading an already saved source reuses its recorded location. Moving the existing library is outside this change.
