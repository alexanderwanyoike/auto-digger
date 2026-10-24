# Genre-dependent styles

Discogs defines styles as subdivisions of genres. The app previously supplied all 757 style names to every genre selection because the bundled package exports two independent flat lists. This made Hip Hop offer unrelated options such as Deep House, and previous style selections remained applied after changing genre.

The Style suggestions now use the union of the selected genres' reference groups, without duplicate suggestions. Selecting only Hip Hop offers Boom Bap, Conscious, Gangsta and its other listed styles, rather than the Electronic list. Changing genre removes selected styles known to belong outside the remaining groups. Clearing all genres restores the complete flat style catalogue and keeps valid selected styles. These are draft changes; searching still applies the form explicitly, and random digging retains the last applied criteria.

`GenreStyleFilters` owns the two related draft selections. It composes the existing MIT-licensed React Select control using its controlled value/onChange API. The form and IPC continue using the existing string-array filters. No new runtime dependency, API request or credentials are needed.

## Reference provenance and limits

The hierarchy is a bundled snapshot of factual genre/style names and relationships from Discogs' former Genres and Styles reference. The [published extraction by Serhii-DV](https://gist.github.com/Serhii-DV/14d7ec13fd15e30db1a2a8dff047abbf) identifies the [official page archived on 2022-08-10](https://web.archive.org/web/20220810095106/https://blog.discogs.com/en/genres-and-styles/). The input is pinned to JSON revision `f1f12236075019653b837a8fd34727ff571d5f04`; the app sorts the groups and normalizes the Children's apostrophe to the bundled genre name. No extraction JavaScript, descriptions, artwork or other upstream code is copied. The metadata source is attributed here; React Select retains its existing MIT licence.

The table covers all 15 genre names and 584 styles. It is a historical reference, not a live or complete current hierarchy. The installed flat vocabulary is newer. Styles absent from the hierarchy remain available in the unrestricted list or through explicit entry, and genre changes retain those explicit values rather than guessing a parent. Styles known to belong elsewhere cannot be recreated to bypass the scoped suggestions. This preserves access to newer names such as Drill without pretending their relationship has been verified by the snapshot.

The current [Discogs guidelines](https://support.discogs.com/hc/en-us/articles/360005055213-Database-Guidelines-9-Genres-Styles) confirm the hierarchy. The public Hip Hop page was also inspected in the browser; its Related Styles section is a co-occurrence list and includes House, so it is not used as a canonical taxonomy. The historical reference redirects to Digs today, and the current submission form requires login. Future taxonomy updates should replace the versioned factual table from a verified reference rather than infer parentage from crossover releases.

Tests reproduce Hip Hop offering Deep House, changing genres with stale selected styles, combining genres, clearing to all styles and explicitly entering newer styles. A native fixture verifies the selected values travel through the renderer and IPC to the actual Discogs query. Test and implementation phases are separate commits.

Depends on #25 and its prerequisites. Created from dev with the prerequisite feature integrated locally. Targets dev and remains unmerged.
