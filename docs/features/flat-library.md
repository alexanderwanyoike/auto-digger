# Track list and flatter surfaces

The user requested Downloads as a simple searchable list of tracks, and fewer card containers across the app. This supersedes the earlier separate queue panel in Downloads.

Downloads now has one search toolbar and one table: sleeve/title, artist, release and actions. Saved tracks appear once. Current source activity is merged into its track row, with progress, cancellation or retry inline. A completed attempt does not create a second copy of the saved track. Superseded attempts for the same source are consolidated; source-page history remains available. Search includes artist, track and release metadata for saved and pending tracks.

The loaded track has a restrained accent marker. Play and reveal controls stay visible. Tagging warnings are available through an accessible disclosure beside the title, rather than repeated paragraphs in every row. Missing-file status stays explicit. Queue communication errors remain readable.

Remove the rounded outer section panels and nested source/queue boxes. Crates use release headings and separators, Settings uses plain groups, and the desk retains clear column divisions. Keep the established brushed surface, materials, accent choices, local fonts, artwork and persistent bottom player. Settings remains a cog at the navigation's right edge.

The interaction pattern is informed by the [Mixxx track library](https://manual.mixxx.org/2.5/en/chapters/library): searchable track rows with consistent columns and play/file actions. Mixxx is [GPL-2.0-or-later](https://github.com/mixxxdj/mixxx/blob/main/LICENSE). This is an independent React/CSS implementation; no Mixxx code, skins or assets are copied. The frontend-design skill informed the restrained native direction.

Native checks cover one row per saved source, search, cached-job consolidation, pending metadata/cancellation, playback and compact crate controls. Inspect Downloads in light/dark at 900px and 1180px, plus Crates, Settings and desk screenshots. Existing queue, offline, migration and credential checks remain required.

Dependencies: #15, #16, #17, #18, #19, then this focused design change. The branch starts from dev, integrates the prerequisite feature branches locally and targets dev. New PRs remain unmerged.
