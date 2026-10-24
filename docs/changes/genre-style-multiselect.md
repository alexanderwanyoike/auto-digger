# Genre and style multi-select

Genres and styles are searchable multi-select fields. A release matches any selected genre AND any selected style; an empty field imposes no restriction. Removing chips and clearing a field edit the draft. Search EPs applies the complete selection, and subsequent pagination and random digging retain that snapshot.

The main-process boundary accepts arrays, trims and deduplicates values, and sorts them so selection order does not reset digging history. Each field is encoded with pipe-separated alternatives in Discogs' scalar query parameter. Duplicate query keys retain one value and comma-separated tags intersect, so neither represents the requested OR semantics.

## Sources and patterns

- React Select 5.10.2 supplies the MIT-licensed accessible searchable multi-select and keyboard behavior: https://react-select.com/ and https://github.com/JedWatson/react-select.
- `discogs-dataset-genres-styles` 2.0.0 supplies 15 genres and 757 styles from the August 2026 Discogs dump. Package code is MIT; extracted data is CC0. New taxonomy names can also be entered, avoiding a fixed vocabulary ceiling. https://github.com/hastefuI/discogs-dataset-genres-styles
- A live API compatibility check on 2026-10-24 confirmed pipe OR through inclusion/exclusion: Electronic EPs 567,327 + Jazz EPs 58,854 - their intersection 4,871 = pipe-query union 621,310. Deep House EPs 47,816 + Techno EPs 142,221 - intersection 6,898 = pipe-query union 183,139. Counts are an observation at verification time, not fixed application data. Requests used only the public API and no user credentials.

## Acceptance

- Select, search, remove and clear multiple genre/style values using mouse or keyboard.
- Submit all selected values through the real preload/IPC path.
- Preserve applied selections during pagination and Dig again while draft edits remain local.
- Use explicit validation failures for malformed selections and retain the existing compact light/dark layout.
