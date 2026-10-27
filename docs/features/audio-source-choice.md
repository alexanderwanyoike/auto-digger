# Release audio sources

YouTube and Soulseek share one Audio sources section in the release view. Compact, right-aligned provider buttons select which source to use. Provider choice uses the application's existing React state/composition pattern and native buttons with a visible pressed state and keyboard focus.

YouTube keeps its verified uploads, Discogs assignments and release download action. Its component stays mounted when switching providers so manual assignments are preserved. Soulseek offers a release-title search row and one row per Discogs track. Opening a row starts its search with refine above the compact results table. Edited queries survive switching rows. Release-search files receive independent track suggestions from the existing unambiguous title matcher, with a per-file correction selector. Unassigned files retain their filenames. A release without attached YouTube videos can still use Soulseek.

Both providers feed the existing download queue and saved library. A successful Soulseek download leaves the current source controls visible with its saved state. Finishing an earlier track's download cannot close another track's search. Opening another search row or leaving Soulseek disposes the old search through the existing search hook. The disclosure uses native buttons and the WAI-ARIA accordion pattern with expanded state and controlled panels.

The tracklist remains record metadata, rather than a second download entry point. Setup instructions and fixture screenshots follow the shared Audio sources location. Regression checks cover provider selection, query refinement, private-result separation, release and per-track queries, filename assignments, pending download completion after opening another track, saving and restart persistence.

## Preview before saving

Use the play icon beside a YouTube source or public Soulseek result to preview it. The player labels temporary audio as Preview. Previewing keeps the audio out of Downloads and the library folders until you choose Download. A Soulseek preview must receive the peer file before it can play; use the same control to cancel preparation. While preparing, the bottom player also shows Cancel, which remains available when switching providers, search rows or pages. Other sources can still join the download queue. Preparation state follows the existing application-owned React hook pattern, keeping the source controls and persistent player in sync.

Temporary audio is cached for this app session, with at most ten recently used sources, and cleared on quit. Previewing again reuses the cached file. Saving uses those bytes, applies the current Discogs track assignment and style-only MP3 genre tags, and places the file in the configured download hierarchy. The staged-copy and hard-link publication pattern follows the existing audio library and works across volumes; temporary audio is removed after a successful library commit. Active playback can still resolve its preview URL after promotion. Existing saved files play directly.

Backend regression tests cover reuse, library isolation, corrected assignments, cancellation and cleanup. Desktop checks count extractions and peer transfers, play the preview before saving and read back saved MP3 tags.
