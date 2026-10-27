# Release audio sources

YouTube and Soulseek share one Audio sources section in the release view. Compact, right-aligned provider buttons select which source to use. Provider choice uses the application's existing React state/composition pattern and native buttons with a visible pressed state and keyboard focus.

YouTube keeps its verified uploads, Discogs assignments and release download action. Its component stays mounted when switching providers so manual assignments are preserved. Soulseek offers a release-title search row and one row per Discogs track. Opening a row starts its search with refine above the compact results table. Edited queries survive switching rows. Release-search files receive independent track suggestions from the existing unambiguous title matcher, with a per-file correction selector. Unassigned files retain their filenames. A release without attached YouTube videos can still use Soulseek.

Both providers feed the existing download queue and saved library. A successful Soulseek download leaves the current source controls visible with its saved state. Finishing an earlier track's download cannot close another track's search. Opening another search row or leaving Soulseek disposes the old search through the existing search hook. The disclosure uses native buttons and the WAI-ARIA accordion pattern with expanded state and controlled panels.

The tracklist remains record metadata, rather than a second download entry point. Setup instructions and fixture screenshots follow the shared Audio sources location. Regression checks cover provider selection, query refinement, private-result separation, release and per-track queries, filename assignments, pending download completion after opening another track, saving and restart persistence.
