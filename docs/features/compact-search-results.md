# Compact search summaries

Long Discogs label/publisher lists were rendered in full in search results. Their unrestricted height determined the grid row height, leaving large gaps before the next row. Long titles and unbroken strings could also overrun the intended summary space.

Reserve two lines each for the release title and year/labels, with ellipsis for longer values. Short summaries reserve the same space, keeping artwork, metadata and bottom dividers aligned. Long unbroken words wrap within the column. Full text remains in the DOM and accessible button name, and native title tooltips expose the complete title and summary on hover. Opening the release still shows its full metadata.

This follows the native CSS line-clamping pattern checked against [Tailwind Labs' line-clamp implementation](https://github.com/tailwindlabs/tailwindcss-line-clamp/blob/master/src/index.js) ([MIT licence](https://github.com/tailwindlabs/tailwindcss-line-clamp/blob/master/LICENSE)). No plugin, dependencies or upstream JavaScript are copied. The app's existing typography, artwork, grid and muted divider treatment remain.

A native Electron regression searches 18 synthetic releases with long titles, unbroken text and 35-label lists at 900px and 1920px. It measures rendered title/summary heights, bounds the text area, checks equal result heights and absence of horizontal overflow, preserves the complete tooltip text, captures both appearance modes and opens a release. The regression failed before the fix and passes afterward; test and implementation are separate commits.

Depends on #24 and its prerequisites. Created from dev with the prerequisite feature integrated locally. Targets dev and remains unmerged.
