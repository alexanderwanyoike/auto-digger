# Configurable download folders

Status: accepted for production folder organisation.

Keep the default Music/Auto Digger destination. Configure future folders with one relative path template using `<source>`, `<genre>`, `<year>`, `<label>`, `<artist>` and `<release>`, separated by `/`. Literal text and combined segments such as `<year> - <release>` are supported. An empty template means the destination root. Source names are YouTube and Soulseek. Genre and label use the first Discogs value, with Unknown fallbacks for missing metadata. The release placeholder contains the release title and pressing ID.

Settings shows one editable field, an always-visible placeholder reference, a live example path and an explicit save action. Removing a placeholder from the field does not remove it from the reference. Persist the template with the existing validated SQLite preferences snapshot. Translate older flat, per-release and ordered-folder settings into equivalent editable templates while retaining their original download behaviour until edited. Appearance changes preserve saved templates, including an empty template.

The interaction follows the established metadata path-template pattern in [beets](https://beets.readthedocs.io/en/stable/reference/pathformat.html), using the user's requested angle-bracket syntax and a small whitelist. No upstream implementation is copied. Reject unknown/incomplete placeholders, absolute paths, traversal and invalid literal filename characters before saving. Substitute metadata as folder-name text, so metadata cannot introduce new path separators. Preserve the pressing ID even when long rendered segments need shortening.

Continue the application's existing filename sanitisation and indexed-library destination pattern. Resolve every segment beneath the selected destination; metadata cannot introduce separators or traversal. Source-specific adapters supply the source name rather than managing paths themselves. No new package or copied implementation is needed.

Apply changes only to future downloads. Existing files stay at their recorded locations and remain playable after restart. Downloading an already saved source reuses its recorded location. Moving the existing library is outside this change.
