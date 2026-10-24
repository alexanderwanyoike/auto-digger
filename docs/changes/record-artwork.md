# Record artwork throughout the desk

Make records recognizable visually: search results use cover-led cards, saved crate entries include sleeve thumbnails, and the selected record's larger artwork/credits appear before its YouTube player. Keep title, artist and catalogue metadata readable in the existing compact aluminium light/dark interface.

Use Discogs' `cover_image` for search cards and fall back to `thumb` when the larger image is absent or untrusted. Only HTTPS artwork on known Discogs image hosts crosses the main-process boundary. Saved metadata already contains its artwork URL, so crate thumbnails need no new metadata lookup.

One reusable artwork component handles images, missing artwork and failed image loads. Lazy-load decorative list images and eagerly load the selected sleeve. Changing the image URL must allow a fresh load after a previous failure. Decorative covers are hidden from assistive technology when the adjacent record title already labels the action.

The record header/player layout uses React composition; CSS Grid supplies the responsive sleeve gallery. These are established patterns already used in this codebase. No generated or invented album covers are substituted for missing Discogs art.

Acceptance: test trusted thumbnail fallback, rendered search and crate images, image-error recovery, header ordering above playback and actual cover visibility in compact native windows.
